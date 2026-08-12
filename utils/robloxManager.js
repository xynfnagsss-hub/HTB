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
    throw new Error('Roblox bot session is not logged in. Set ROBLOX_COOKIE in environment variables to enable group ranking.');
  }

  const cleanGroupId = parseInt(groupId || process.env.ROBLOX_GROUP_ID);
  if (!cleanGroupId) throw new Error('Roblox Group ID is not configured.');

  let targetId = targetUserId;
  let targetName = targetUserId;

  if (typeof targetUserId === 'string' && !/^\d+$/.test(targetUserId)) {
    try {
      targetId = await noblox.getIdFromUsername(targetUserId);
      targetName = targetUserId;
    } catch {
      throw new Error(`Roblox player "${targetUserId}" not found on Roblox.`);
    }
  } else {
    try {
      const info = await noblox.getPlayerInfo(parseInt(targetId));
      targetName = info.username;
    } catch {}
  }

  if (!targetId) throw new Error(`Roblox player "${targetUserId}" not found.`);

  // Get current player rank in group
  const previousRankId = await noblox.getRankInGroup(cleanGroupId, parseInt(targetId)).catch(() => 0);
  const previousRankName = await noblox.getRankNameInGroup(cleanGroupId, parseInt(targetId)).catch(() => 'Guest');

  if (previousRankId === 0) {
    throw new Error(`Player "${targetName}" is not currently in the HTB Roblox Group. They must join the group (https://www.roblox.com/groups/${cleanGroupId}) before they can be ranked.`);
  }

  if (previousRankId === 255) {
    throw new Error(`Cannot change the rank of the Roblox Group Owner.`);
  }

  // Fetch all available group roles
  const groupRoles = await noblox.getRoles(cleanGroupId);
  const assignableRoles = groupRoles.filter(r => r.rank > 0 && r.rank < 255);

  let targetRole = null;

  // Match by rank number or name
  if (typeof rankIdentifier === 'number' || /^\d+$/.test(String(rankIdentifier))) {
    const num = parseInt(rankIdentifier);
    targetRole = assignableRoles.find(r => r.rank === num);
  }

  if (!targetRole && typeof rankIdentifier === 'string') {
    const cleanQuery = rankIdentifier.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    
    targetRole = assignableRoles.find(r => r.name.toLowerCase() === rankIdentifier.trim().toLowerCase()) ||
                 assignableRoles.find(r => r.name.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanQuery) ||
                 assignableRoles.find(r => r.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cleanQuery)) ||
                 assignableRoles.find(r => cleanQuery.includes(r.name.toLowerCase().replace(/[^a-z0-9]/g, '')));

    // Keyword aliases for common nicknames
    if (!targetRole) {
      if (cleanQuery.includes('hitta')) targetRole = assignableRoles.find(r => r.name.toLowerCase().includes('hitta'));
      else if (cleanQuery.includes('onetap') || cleanQuery.includes('1tap')) targetRole = assignableRoles.find(r => r.name.toLowerCase().includes('onetap'));
      else if (cleanQuery.includes('free')) targetRole = assignableRoles.find(r => r.name.toLowerCase().includes('free'));
      else if (cleanQuery.includes('staff')) targetRole = assignableRoles.find(r => r.name.toLowerCase().includes('staff'));
      else if (cleanQuery.includes('admin')) targetRole = assignableRoles.find(r => r.name.toLowerCase().includes('admin'));
      else if (cleanQuery.includes('co') || cleanQuery.includes('creator')) targetRole = assignableRoles.find(r => r.name.toLowerCase().includes('creator'));
    }
  }

  if (!targetRole) {
    const validList = assignableRoles.map(r => `• **${r.name}** (Rank \`${r.rank}\`)`).join('\n');
    throw new Error(`Rank "${rankIdentifier}" is not a valid rank in this group.\n\n**Available Ranks in Group:**\n${validList}`);
  }

  try {
    await noblox.setRank(cleanGroupId, parseInt(targetId), targetRole.rank);
    return {
      targetId: parseInt(targetId),
      targetName,
      previousRankName,
      previousRankId,
      newRankName: targetRole.name,
      newRankId: targetRole.rank,
    };
  } catch (err) {
    if (err.message.includes('The user is invalid') || err.message.includes('code":3')) {
      throw new Error(`Player "${targetName}" is not in the group or cannot be ranked.`);
    }
    throw err;
  }
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
async function linkRobloxUser(discordId, robloxUsernameOrId, groupId = process.env.ROBLOX_GROUP_ID) {
  const profile = await getPlayerProfile(robloxUsernameOrId, groupId);

  const cleanGroupId = parseInt(groupId || '316559660');
  if (profile.groupRankId === 0 || profile.groupRank === 'Not in Group') {
    const error = new Error(`You must join the official HTB Roblox Group before verifying.`);
    error.mustJoinGroup = true;
    error.groupId = cleanGroupId;
    error.profile = profile;
    throw error;
  }

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

    // HTB STAFF (Rank 252)
    { roleName: 'Ticket Support', rankName: 'HTB STAFF' },
    { roleName: 'CHAT/VC MOD', rankName: 'HTB STAFF' },
    { roleName: 'Staff', rankName: 'HTB STAFF' },

    // OneTap Access (Rank 3)
    { roleName: 'ONE-TAP ACCESS', rankName: 'OneTap Access' },
    { roleName: 'OneTap', rankName: 'OneTap Access' },

    // Hitta Acess (Rank 2)
    { roleName: 'Hitta Access', rankName: 'Hitta Acess' },
    { roleName: 'Half Access', rankName: 'Hitta Acess' },
    { roleName: 'CUSTOM ROLE', rankName: 'Hitta Acess' },
    { roleName: 'Noted Member', rankName: 'Hitta Acess' },

    // Free Access / HTB FAM (Rank 1 - Default Entry Rank)
    { roleName: 'HTB FAM', rankName: 'HTB FAM' },
    { roleName: 'Free Access', rankName: 'HTB FAM' },
    { roleName: 'Verified', rankName: 'HTB FAM' },
    { roleName: 'Member', rankName: 'HTB FAM' },
  ];

  // If user is the bot account itself, skip ranking self
  if (currentRobloxUser && linked.robloxId === currentRobloxUser.id) {
    const myRank = await noblox.getRankNameInGroup(parseInt(groupId), linked.robloxId).catch(() => 'Co Creator');
    return { success: true, rank: myRank, isSelf: true };
  }

  const currentRankId = await noblox.getRankInGroup(parseInt(groupId), linked.robloxId).catch(() => 0);
  const currentRankName = await noblox.getRankNameInGroup(parseInt(groupId), linked.robloxId).catch(() => 'Guest');

  if (currentRankId >= 254 || currentRankId === 0) {
    return { success: true, rank: currentRankName, currentRankId };
  }

  // Find highest matching role
  for (const mapping of ROLE_RANK_MAP) {
    if (member.roles.cache.some(r => r.name.toLowerCase().includes(mapping.roleName.toLowerCase()))) {
      try {
        if (currentRankName.toLowerCase() !== mapping.rankName.toLowerCase()) {
          await noblox.setRank(parseInt(groupId), linked.robloxId, mapping.rankName).catch(async () => {
            await noblox.setRank(parseInt(groupId), linked.robloxId, 1).catch(() => {});
          });
          console.log(`⚡ [Auto-Rank]: Ranked ${linked.robloxUsername} to "${mapping.rankName}" (Matching Discord role: ${mapping.roleName})`);
          return { success: true, rank: mapping.rankName };
        } else {
          return { success: true, rank: currentRankName, alreadyRanked: true };
        }
      } catch (e) {
        console.error(`[Auto-Rank Error]:`, e.message);
      }
      break;
    }
  }

  // Default fallback: If in group, ensure they have at least "HTB FAM"
  try {
    if (currentRankName.toLowerCase() !== 'htb fam' && currentRankId <= 1) {
      await noblox.setRank(parseInt(groupId), linked.robloxId, 'HTB FAM').catch(async () => {
        await noblox.setRank(parseInt(groupId), linked.robloxId, 1).catch(() => {});
      });
      console.log(`⚡ [Auto-Rank]: Auto-roled ${linked.robloxUsername} to "HTB FAM" in Roblox Group`);
      return { success: true, rank: 'HTB FAM' };
    }
  } catch (e) {
    console.error(`[Auto-Rank Default Error]:`, e.message);
  }

  return { success: true, rank: currentRankName };
}

/**
 * Start Background Poller for Roblox Group Joins
 */
function startGroupJoinWatcher(client, groupId = process.env.ROBLOX_GROUP_ID, intervalMs = 30000) {
  if (!groupId) return;

  console.log(`👀 [Roblox Manager]: Group Join Watcher started for Group ID ${groupId} (Auto-Rank HTB FAM enabled)`);
  setInterval(async () => {
    try {
      if (!isRobloxAuthenticated) return;
      const cleanGroupId = parseInt(groupId);
      const auditLog = await noblox.getAuditLog(cleanGroupId, { actionType: 'JoinGroup', limit: 15 });
      
      if (auditLog && auditLog.data) {
        for (const entry of auditLog.data) {
          const robloxUserId = entry.actor?.user?.userId;
          if (!robloxUserId) continue;

          // 1. Auto-Role in Roblox Group to "HTB FAM"
          try {
            const currentRank = await noblox.getRankNameInGroup(cleanGroupId, robloxUserId).catch(() => 'Guest');
            if (currentRank.toLowerCase() === 'guest' || currentRank.toLowerCase() === 'free access' || currentRank === '1') {
              await noblox.setRank(cleanGroupId, robloxUserId, 'HTB FAM').catch(async () => {
                await noblox.setRank(cleanGroupId, robloxUserId, 1).catch(() => {});
              });
              console.log(`🎉 [Group Join Auto-Role]: Auto-roled new joiner Roblox ID ${robloxUserId} to "HTB FAM"`);
            }
          } catch (rankErr) {
            console.warn(`[Join Auto-Rank Error ${robloxUserId}]:`, rankErr.message);
          }

          // 2. Find if this Roblox user is verified in our database & sync Discord
          const record = await RobloxUser.findOne({ robloxId: robloxUserId });
          if (record && record.discordId) {
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
