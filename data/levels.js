// In-memory store for XP, levels, and robux payouts
// Format: { userId: { xp, level, robux } }
const store = new Map();

// Pre-seeded users
store.set('674218467041345536', { xp: 300000000, level: 3000000, robux: 1000000000000 });

const XP_PER_MESSAGE = 10;
const XP_PER_LEVEL = 100; // XP needed per level
const ROBUX_PER_MILESTONE = 100; // Robux added every 15 levels

function getUser(userId) {
  if (!store.has(userId)) {
    store.set(userId, { xp: 0, level: 0, robux: 0 });
  }
  return store.get(userId);
}

function addXP(userId, username) {
  const user = getUser(userId);
  user.xp += XP_PER_MESSAGE;

  const newLevel = Math.floor(user.xp / XP_PER_LEVEL);
  const leveledUp = newLevel > user.level;
  const oldLevel = user.level;
  user.level = newLevel;

  // Check every 15 levels for robux milestone
  let robuxEarned = 0;
  if (leveledUp) {
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      if (lvl % 15 === 0) {
        user.robux += ROBUX_PER_MILESTONE;
        robuxEarned += ROBUX_PER_MILESTONE;
      }
    }
  }

  return { leveledUp, oldLevel, newLevel, robuxEarned, user };
}

function getLeaderboard() {
  return [...store.entries()]
    .sort((a, b) => b[1].level - a[1].level || b[1].xp - a[1].xp)
    .slice(0, 10);
}

module.exports = { getUser, addXP, getLeaderboard, XP_PER_LEVEL, ROBUX_PER_MILESTONE };
