const User = require('../models/User');

const ROBUX_PER_MILESTONE = 100;

/**
 * Calculates the total XP required to reach a specific level.
 * Progressive quadratic scaling (harder as level increases)
 * Level 1: 100 XP
 * Level 2: 255 XP
 * Level 5: 1,050 XP
 * Level 10: 3,850 XP
 * Level 20: 16,700 XP
 * Level 50: 153,250 XP
 */
function getXPForLevel(level) {
  if (level <= 0) return 0;
  let total = 0;
  for (let l = 0; l < level; l++) {
    total += 5 * Math.pow(l, 2) + 50 * l + 100;
  }
  return total;
}

/**
 * Determines the current level based on total accumulated XP.
 */
function getLevelFromXP(totalXP) {
  let level = 0;
  while (getXPForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

/**
 * Returns XP progress within the current level:
 * { currentLevel, currentLevelXP, neededForNextLevel, progressPercent }
 */
function getLevelProgress(totalXP) {
  const currentLevel = getLevelFromXP(totalXP);
  const currentLevelBaseXP = getXPForLevel(currentLevel);
  const nextLevelTotalXP = getXPForLevel(currentLevel + 1);
  const xpInCurrentLevel = totalXP - currentLevelBaseXP;
  const xpNeededForLevel = nextLevelTotalXP - currentLevelBaseXP;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100)));

  return {
    currentLevel,
    currentLevelBaseXP,
    nextLevelTotalXP,
    xpInCurrentLevel,
    xpNeededForLevel,
    xpRemaining: nextLevelTotalXP - totalXP,
    progressPercent,
  };
}

async function getUser(userId) {
  let user = await User.findOne({ userId });
  if (!user) {
    user = await User.create({ userId, xp: 0, level: 0, robux: 0 });
  }
  return user;
}

async function addXP(userId, xpAmount = 20) {
  const user = await User.findOneAndUpdate(
    { userId },
    { $inc: { xp: xpAmount }, $setOnInsert: { level: 0, robux: 0 } },
    { upsert: true, returnDocument: 'after', new: true }
  );

  const newXP = user.xp;
  const oldLevel = user.level || 0;
  const newLevel = getLevelFromXP(newXP);
  const leveledUp = newLevel > oldLevel;

  let robuxEarned = 0;
  if (leveledUp) {
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      if (lvl % 15 === 0) robuxEarned += ROBUX_PER_MILESTONE;
    }

    await User.updateOne(
      { userId },
      { $set: { level: newLevel }, $inc: { robux: robuxEarned } }
    );
  }

  return { leveledUp, oldLevel, newLevel, robuxEarned, totalXP: newXP };
}

async function setUser(userId, data) {
  await User.findOneAndUpdate({ userId }, { $set: data }, { upsert: true, new: true });
}

async function getLeaderboard() {
  return await User.find().sort({ xp: -1, level: -1 }).limit(10);
}

module.exports = {
  getUser,
  addXP,
  setUser,
  getLeaderboard,
  getXPForLevel,
  getLevelFromXP,
  getLevelProgress,
  ROBUX_PER_MILESTONE,
};
