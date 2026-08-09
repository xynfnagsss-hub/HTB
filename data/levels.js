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
  const user = await getUser(userId);

  user.xp += XP_PER_MESSAGE;

  const newLevel = Math.floor(user.xp / XP_PER_LEVEL);
  const leveledUp = newLevel > user.level;
  const oldLevel = user.level;
  user.level = newLevel;

  let robuxEarned = 0;
  if (leveledUp) {
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      if (lvl % 15 === 0) {
        user.robux += ROBUX_PER_MILESTONE;
        robuxEarned += ROBUX_PER_MILESTONE;
      }
    }
  }

  await user.save();
  return { leveledUp, oldLevel, newLevel, robuxEarned, user };
}

async function setUser(userId, data) {
  await User.findOneAndUpdate({ userId }, data, { upsert: true, new: true });
}

async function getLeaderboard() {
  return await User.find().sort({ level: -1, xp: -1 }).limit(10);
}

module.exports = { getUser, addXP, setUser, getLeaderboard, XP_PER_LEVEL, ROBUX_PER_MILESTONE };
