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

const DEFAULT_ROBLOX_GROUP_ID = 316559660;

/**
 * Lookup Player Profile & Avatars
 */
async function getPlayerProfile(usernameOrId, groupId = process.env.ROBLOX_GROUP_ID || DEFAULT_ROBLOX_GROUP_ID) {
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

  const cleanGroupId = parseInt(groupId || DEFAULT_ROBLOX_GROUP_ID);
  let groupRank = 'Not in Group';
  let groupRankId = 0;

  try {
    groupRankId = await noblox.getRankInGroup(cleanGroupId, userId);
    groupRank = await noblox.getRankNameInGroup(cleanGroupId, userId);
  } catch {}

  // Resilient REST API fallback if noblox returns 0 or errors
  if (groupRankId === 0) {
    try {
      const fetch = globalThis.fetch || require('node-fetch');
      const res = await fetch(`https://groups.roblox.com/v2/users/${userId}/groups/roles`).then(r => r.json());
      if (res && res.data) {
        const found = res.data.find(g => g.group && g.group.id === cleanGroupId);
        if (found && found.role) {
          groupRank = found.role.name || 'Member';
          groupRankId = found.role.rank || 1;
        }
      }
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
async function setPlayerRank(groupId = process.env.ROBLOX_GROUP_ID || DEFAULT_ROBLOX_GROUP_ID, targetUserId, rankIdentifier) {
  if (!isRobloxAuthenticated) {
    throw new Error('Roblox bot session is not logged in. Set ROBLOX_COOKIE in environment variables to enable group ranking.');
  }

  const cleanGroupId = parseInt(groupId || DEFAULT_ROBLOX_GROUP_ID);
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
    throw new Error(`Player "${targetName}" is not currently in the TNM Roblox Group. They must join the group (https://www.roblox.com/groups/${cleanGroupId}) before they can be ranked.`);
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
async function linkRobloxUser(discordId, robloxUsernameOrId, groupId = process.env.ROBLOX_GROUP_ID || DEFAULT_ROBLOX_GROUP_ID) {
  const cleanGroupId = parseInt(groupId || DEFAULT_ROBLOX_GROUP_ID);
  const profile = await getPlayerProfile(robloxUsernameOrId, cleanGroupId);

  const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];
  const isBypass = ADMIN_BYPASS_USERS.includes(discordId);

  if (!isBypass && (profile.groupRankId === 0 || profile.groupRank === 'Not in Group')) {
    const error = new Error(`You must join the official TNM Roblox Group before verifying.`);
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
async function autoRankMemberFromDiscordRoles(member, groupId = process.env.ROBLOX_GROUP_ID || DEFAULT_ROBLOX_GROUP_ID) {
  if (!member || !groupId || !isRobloxAuthenticated) return null;

  const linked = await getLinkedRobloxUser(member.id);
  if (!linked) return null;

  // Exact Role-to-Roblox Rank mapping for TNM Group 316559660
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

    // TNM STAFF (Rank 252)
    { roleName: 'Ticket Support', rankName: 'TNM STAFF' },
    { roleName: 'CHAT/VC MOD', rankName: 'TNM STAFF' },
    { roleName: 'Staff', rankName: 'TNM STAFF' },

    // OneTap Access (Rank 3)
    { roleName: 'ONE-TAP ACCESS', rankName: 'OneTap Access' },
    { roleName: 'OneTap', rankName: 'OneTap Access' },

    // Hitta Acess (Rank 2)
    { roleName: 'Hitta Access', rankName: 'Hitta Acess' },
    { roleName: 'Half Access', rankName: 'Hitta Acess' },
    { roleName: 'CUSTOM ROLE', rankName: 'Hitta Acess' },
    { roleName: 'Noted Member', rankName: 'Hitta Acess' },

    // Free Access / TNM FAM (Rank 1 - Default Entry Rank)
    { roleName: 'TNM FAM', rankName: 'TNM FAM' },
    { roleName: 'Free Access', rankName: 'TNM FAM' },
    { roleName: 'Verified', rankName: 'TNM FAM' },
    { roleName: 'Member', rankName: 'TNM FAM' },
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

  // Default fallback: If in group, ensure they have at least "TNM FAM"
  try {
    if (currentRankName.toLowerCase() !== 'tnm fam' && currentRankName.toLowerCase() !== 'htb fam' && currentRankId <= 1) {
      await noblox.setRank(parseInt(groupId), linked.robloxId, 'TNM FAM').catch(async () => {
        await noblox.setRank(parseInt(groupId), linked.robloxId, 1).catch(() => {});
      });
      console.log(`⚡ [Auto-Rank]: Auto-roled ${linked.robloxUsername} to "TNM FAM" in Roblox Group`);
      return { success: true, rank: 'TNM FAM' };
    }
  } catch (e) {
    console.error(`[Auto-Rank Default Error]:`, e.message);
  }

  return { success: true, rank: currentRankName };
}

const processedJoiners = new Set();

/**
 * Start Background Poller for Roblox Group Joins
 */
function startGroupJoinWatcher(client, groupId = process.env.ROBLOX_GROUP_ID, intervalMs = 10000) {
  if (!groupId) return;

  const cleanGroupId = parseInt(groupId);
  console.log(`👀 [Roblox Manager]: Fast Group Join Watcher started for Group ID ${cleanGroupId} (Auto-Rank TNM FAM active - 10s poll)`);

  const pollGroupJoins = async () => {
    try {
      if (!isRobloxAuthenticated) return;

      // 1. Handle Join Requests if group is on request-to-join
      try {
        const joinReqs = await noblox.getJoinRequests(cleanGroupId, { limit: 25 }).catch(() => null);
        if (joinReqs && joinReqs.data && joinReqs.data.length > 0) {
          for (const req of joinReqs.data) {
            const requesterId = req.requester?.userId;
            if (requesterId) {
              await noblox.handleJoinRequest(cleanGroupId, requesterId, true).catch(() => {});
              await noblox.setRank(cleanGroupId, requesterId, 'TNM FAM').catch(async () => {
                await noblox.setRank(cleanGroupId, requesterId, 1).catch(() => {});
              });
              console.log(`🎉 [Join Request Accepted]: Auto-accepted & ranked Roblox ID ${requesterId} to "TNM FAM"`);
            }
          }
        }
      } catch (reqErr) {
        // Ignored if group is public
      }

      // 2. Poll recent JoinGroup audit logs
      const auditLog = await noblox.getAuditLog(cleanGroupId, { actionType: 'JoinGroup', limit: 20 }).catch(() => null);
      
      if (auditLog && auditLog.data) {
        for (const entry of auditLog.data) {
          const robloxUserId = entry.actor?.user?.userId;
          if (!robloxUserId) continue;

          // Prevent repeated duplicate processing in same session
          const cacheKey = `${robloxUserId}-${entry.created}`;
          if (processedJoiners.has(cacheKey)) continue;
          processedJoiners.add(cacheKey);

          // Keep cache size bounded
          if (processedJoiners.size > 500) {
            const first = processedJoiners.values().next().value;
            processedJoiners.delete(first);
          }

          // 3. Auto-Role in Roblox Group to "TNM FAM"
          try {
            const currentRankName = await noblox.getRankNameInGroup(cleanGroupId, robloxUserId).catch(() => 'Guest');
            const currentRankId = await noblox.getRankInGroup(cleanGroupId, robloxUserId).catch(() => 0);

            if (currentRankId <= 1 || currentRankName.toLowerCase() === 'guest' || currentRankName.toLowerCase() === 'free access' || currentRankName.toLowerCase() === 'member') {
              await noblox.setRank(cleanGroupId, robloxUserId, 'TNM FAM').catch(async () => {
                await noblox.setRank(cleanGroupId, robloxUserId, 1).catch(() => {});
              });
              console.log(`🎉 [Group Join Auto-Role]: Auto-roled new joiner Roblox ID ${robloxUserId} (@${entry.actor?.user?.username || 'User'}) to "TNM FAM"`);
            }
          } catch (rankErr) {
            console.warn(`[Join Auto-Rank Error ${robloxUserId}]:`, rankErr.message);
          }

          // 4. Sync Discord roles if verified in DB
          try {
            const record = await RobloxUser.findOne({ robloxId: robloxUserId });
            if (record && record.discordId) {
              for (const guild of client.guilds.cache.values()) {
                const member = await guild.members.fetch(record.discordId).catch(() => null);
                if (member) {
                  try {
                    const { grantVerifiedRoles } = require('../commands/verify');
                    await grantVerifiedRoles(member);
                  } catch {}
                  await autoRankMemberFromDiscordRoles(member, cleanGroupId).catch(() => {});
                }
              }
            }
          } catch (dbErr) {
            console.warn(`[Discord Role Sync Error]:`, dbErr.message);
          }
        }
      }
    } catch (globalErr) {
      console.warn(`[Group Watcher Loop Warning]:`, globalErr.message);
    }
  };

  // Run immediately on boot + every interval
  pollGroupJoins();
  setInterval(pollGroupJoins, intervalMs);
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
