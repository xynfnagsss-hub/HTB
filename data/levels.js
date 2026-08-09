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
  // Atomically increment XP and get the updated document
  const user = await User.findOneAndUpdate(
    { userId },
    { $inc: { xp: XP_PER_MESSAGE }, $setOnInsert: { level: 0, robux: 0 } },
    { upsert: true, returnDocument: 'after', new: true }
  );

  const newXP = user.xp;
  const oldLevel = user.level;
  const newLevel = Math.floor(newXP / XP_PER_LEVEL);
  const leveledUp = newLevel > oldLevel;

  let robuxEarned = 0;
  if (leveledUp) {
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      if (lvl % 15 === 0) robuxEarned += ROBUX_PER_MILESTONE;
    }
    // Update level and robux atomically
    await User.updateOne(
      { userId, level: oldLevel }, // only update if level hasn't changed (prevents race)
      { $set: { level: newLevel }, $inc: { robux: robuxEarned } }
    );
  }

  return { leveledUp, oldLevel, newLevel, robuxEarned };
}

async function setUser(userId, data) {
  await User.findOneAndUpdate({ userId }, { $set: data }, { upsert: true, new: true });
}

async function getLeaderboard() {
  return await User.find().sort({ level: -1, xp: -1 }).limit(10);
}

module.exports = { getUser, addXP, setUser, getLeaderboard, XP_PER_LEVEL, ROBUX_PER_MILESTONE };
