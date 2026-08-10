const noblox = require('noblox.js');
const RobloxUser = require('../models/RobloxUser');

let isRobloxAuthenticated = false;
let currentRobloxUser = null;

// In-memory cache for verified users if MongoDB is offline
const memoryVerifiedUsers = new Map();

/**
 * Initialize Roblox Bot Session
 */
async function initRoblox(cookie = process.env.ROBLOX_COOKIE) {
  if (!cookie) {
    console.log('ℹ️ [Roblox Manager]: ROBLOX_COOKIE not provided in .env. Public lookups active, ranking commands will require cookie.');
    return false;
  }
  try {
    await noblox.setCookie(cookie.trim());
    currentRobloxUser = await noblox.getAuthenticatedUser();
    isRobloxAuthenticated = true;
    console.log(`✅ [Roblox Manager]: Authenticated as Roblox User: ${currentRobloxUser.name} (ID: ${currentRobloxUser.id})`);
    return true;
  } catch (err) {
    console.error('❌ [Roblox Manager]: Failed to authenticate cookie:', err.message);
    isRobloxAuthenticated = false;
    return false;
  }
}

/**
 * Lookup Player Profile & Avatars
 */
async function getPlayerProfile(usernameOrId, groupId = process.env.ROBLOX_GROUP_ID) {
  let userId;
  if (/^\d+$/.test(usernameOrId)) {
    userId = parseInt(usernameOrId);
  } else {
    userId = await noblox.getIdFromUsername(usernameOrId);
  }

  if (!userId) throw new Error(`Roblox player "${usernameOrId}" not found.`);

  const playerInfo = await noblox.getPlayerInfo(userId);
  const avatars = await noblox.getPlayerThumbnail(userId, '420x420', 'png', false, 'Headshot');
  const avatarUrl = avatars && avatars[0] ? avatars[0].imageUrl : 'https://www.roblox.com/images/default.png';

  let groupRank = 'Not in Group';
  let groupRankId = 0;
  if (groupId) {
    try {
      groupRank = await noblox.getRankNameInGroup(parseInt(groupId), userId);
      groupRankId = await noblox.getRankInGroup(parseInt(groupId), userId);
    } catch {}
  }

  return {
    userId,
    username: playerInfo.username,
    displayName: playerInfo.displayName,
    description: playerInfo.blurb || 'No bio provided.',
    joinDate: playerInfo.joinDate,
    age: playerInfo.age,
    isBanned: playerInfo.isBanned,
    avatarUrl,
    groupRank,
    groupRankId,
  };
}

/**
 * Set / Change Member Rank in Roblox Group
 */
async function setPlayerRank(groupId, targetUserId, rankIdentifier) {
  if (!isRobloxAuthenticated) {
    throw new Error('Roblox bot session is not logged in. Set ROBLOX_COOKIE in .env to enable group ranking.');
  }

  const cleanGroupId = parseInt(groupId || process.env.ROBLOX_GROUP_ID);
  if (!cleanGroupId) throw new Error('Roblox Group ID is not configured.');

  let targetId = targetUserId;
  if (typeof targetUserId === 'string' && !/^\d+$/.test(targetUserId)) {
    targetId = await noblox.getIdFromUsername(targetUserId);
  }

  return await noblox.setRank(cleanGroupId, parseInt(targetId), rankIdentifier);
}

/**
 * Get Linked Roblox User for Discord Member
 */
async function getLinkedRobloxUser(discordId) {
  if (memoryVerifiedUsers.has(discordId)) {
    return memoryVerifiedUsers.get(discordId);
  }
  try {
    const record = await RobloxUser.findOne({ discordId });
    if (record) {
      memoryVerifiedUsers.set(discordId, record);
      return record;
    }
  } catch {}
  return null;
}

/**
 * Link Discord ID with Roblox Account
 */
async function linkRobloxUser(discordId, robloxUsernameOrId) {
  const profile = await getPlayerProfile(robloxUsernameOrId);
  const data = {
    discordId,
    robloxId: profile.userId,
    robloxUsername: profile.username,
    verifiedAt: new Date(),
  };

  memoryVerifiedUsers.set(discordId, data);
  try {
    await RobloxUser.findOneAndUpdate({ discordId }, data, { upsert: true, new: true });
  } catch {}

  return profile;
}

/**
 * Auto-Rank a Discord Member in the Roblox Group based on their Discord Roles
 */
async function autoRankMemberFromDiscordRoles(member, groupId = process.env.ROBLOX_GROUP_ID) {
  if (!member || !groupId || !isRobloxAuthenticated) return null;

  const linked = await getLinkedRobloxUser(member.id);
  if (!linked) return null;

  // Exact Role-to-Roblox Rank mapping for HTB Group 316559660
  const ROLE_RANK_MAP = [
    // Co Creator (Rank 254)
    { roleName: 'First in Command', rankName: 'Co Creator' },
    { roleName: 'Second in Command', rankName: 'Co Creator' },
    { roleName: 'Third in Command', rankName: 'Co Creator' },
    { roleName: 'Command Officer', rankName: 'Co Creator' },

    // Admin (Rank 253)
    { roleName: 'Sergeant', rankName: 'Admin' },
    { roleName: 'OVERSEER', rankName: 'Admin' },
    { roleName: 'Ranking Staff', rankName: 'Admin' },
    { roleName: 'Lead Moderator', rankName: 'Admin' },
    { roleName: 'Administrator', rankName: 'Admin' },
    { roleName: 'Ticket Support', rankName: 'Admin' },
    { roleName: 'CHAT/VC MOD', rankName: 'Admin' },

    // TNM FAM (Rank 3)
    { roleName: 'ONE-TAP ACCESS', rankName: 'TNM FAM' },
    { roleName: 'Hitta Access', rankName: 'TNM FAM' },
    { roleName: 'Half Access', rankName: 'TNM FAM' },
    { roleName: 'CUSTOM ROLE', rankName: 'TNM FAM' },
    { roleName: 'Noted Member', rankName: 'TNM FAM' },

    // Base Member (Rank 1)
    { roleName: 'Member', rankName: 'Member' },
  ];

  // Find highest matching role
  for (const mapping of ROLE_RANK_MAP) {
    if (member.roles.cache.some(r => r.name.toLowerCase().includes(mapping.roleName.toLowerCase()))) {
      try {
        const currentRank = await noblox.getRankNameInGroup(parseInt(groupId), linked.robloxId);
        if (currentRank.toLowerCase() !== mapping.rankName.toLowerCase() && currentRank !== 'Guest') {
          await noblox.setRank(parseInt(groupId), linked.robloxId, mapping.rankName);
          console.log(`⚡ [Auto-Rank]: Ranked ${linked.robloxUsername} to "${mapping.rankName}" (Matching Discord role: ${mapping.roleName})`);
          return { success: true, rank: mapping.rankName };
        }
      } catch (e) {
        console.error(`[Auto-Rank Error]:`, e.message);
      }
      break;
    }
  }
  return null;
}

/**
 * Start Background Poller for Roblox Group Joins
 */
function startGroupJoinWatcher(client, groupId = process.env.ROBLOX_GROUP_ID, intervalMs = 30000) {
  if (!groupId) return;

  console.log(`👀 [Roblox Manager]: Group Join Watcher started for Group ID ${groupId}`);
  setInterval(async () => {
    try {
      if (!isRobloxAuthenticated) return;
      const cleanGroupId = parseInt(groupId);
      const auditLog = await noblox.getAuditLog(cleanGroupId, { actionType: 'JoinGroup', limit: 10 });
      
      if (auditLog && auditLog.data) {
        for (const entry of auditLog.data) {
          const robloxUserId = entry.actor.user.userId;
          // Find if this Roblox user is verified in our database
          const record = await RobloxUser.findOne({ robloxId: robloxUserId });
          if (record && record.discordId) {
            // Find Discord guild member
            for (const guild of client.guilds.cache.values()) {
              try {
                const member = await guild.members.fetch(record.discordId);
                if (member) {
                  await autoRankMemberFromDiscordRoles(member, cleanGroupId);
                }
              } catch {}
            }
          }
        }
      }
    } catch {}
  }, intervalMs);
}

module.exports = {
  initRoblox,
  getPlayerProfile,
  setPlayerRank,
  getLinkedRobloxUser,
  linkRobloxUser,
  autoRankMemberFromDiscordRoles,
  startGroupJoinWatcher,
  noblox,
};
