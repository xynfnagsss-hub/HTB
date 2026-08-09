const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'levels.json');

const XP_PER_MESSAGE = 10;
const XP_PER_LEVEL = 100;
const ROBUX_PER_MILESTONE = 100;

// Load from file or start fresh
function loadStore() {
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      return new Map(Object.entries(JSON.parse(raw)));
    } catch {
      return new Map();
    }
  }
  return new Map();
}

function saveStore(store) {
  const obj = Object.fromEntries(store);
  fs.writeFileSync(DB_PATH, JSON.stringify(obj, null, 2), 'utf8');
}

const store = loadStore();

// Pre-seed user if not already saved
if (!store.has('674218467041345536')) {
  store.set('674218467041345536', { xp: 300000000, level: 3000000, robux: 1000000000000 });
  saveStore(store);
}

function getUser(userId) {
  if (!store.has(userId)) {
    store.set(userId, { xp: 0, level: 0, robux: 0 });
    saveStore(store);
  }
  return store.get(userId);
}

function addXP(userId) {
  const user = getUser(userId);
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

  saveStore(store);
  return { leveledUp, oldLevel, newLevel, robuxEarned, user };
}

function setUser(userId, data) {
  store.set(userId, data);
  saveStore(store);
}

function getLeaderboard() {
  return [...store.entries()]
    .sort((a, b) => b[1].level - a[1].level || b[1].xp - a[1].xp)
    .slice(0, 10);
}

module.exports = { getUser, addXP, setUser, getLeaderboard, XP_PER_LEVEL, ROBUX_PER_MILESTONE };
