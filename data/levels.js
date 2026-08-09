const User = require('../models/User');

const XP_PER_MESSAGE = 10;
const XP_PER_LEVEL = 100;
const ROBUX_PER_MILESTONE = 100;

async function getUser(userId) {
  let user = await User.findOne({ userId });
  if (!user) {
    user = await User.create({ userId, xp: 0, level: 0, robux: 0 });
  }
  return user;
}

async function addXP(userId) {
  // Use atomic findOneAndUpdate to prevent race conditions causing duplicate level-up messages
  const user = await User.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, xp: 0, level: 0, robux: 0 } },
    { upsert: true, new: true }
  );

  const oldLevel = user.level;
  const newXP = user.xp + XP_PER_MESSAGE;
  const newLevel = Math.floor(newXP / XP_PER_LEVEL);
  const leveledUp = newLevel > oldLevel;

  let robuxEarned = 0;
  if (leveledUp) {
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      if (lvl % 15 === 0) robuxEarned += ROBUX_PER_MILESTONE;
    }
  }

  // Atomic update — prevents two simultaneous saves fighting each other
  await User.updateOne(
    { userId },
    { $set: { xp: newXP, level: newLevel, robux: user.robux + robuxEarned } }
  );

  return { leveledUp, oldLevel, newLevel, robuxEarned };
}

async function setUser(userId, data) {
  await User.findOneAndUpdate({ userId }, data, { upsert: true, new: true });
}

async function getLeaderboard() {
  return await User.find().sort({ level: -1, xp: -1 }).limit(10);
}

module.exports = { getUser, addXP, setUser, getLeaderboard, XP_PER_LEVEL, ROBUX_PER_MILESTONE };
