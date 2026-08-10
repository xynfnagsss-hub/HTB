const mongoose = require('mongoose');

const robloxUserSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  robloxId: { type: Number, required: true },
  robloxUsername: { type: String, required: true },
  verifiedAt: { type: Date, default: Date.now },
  lastRankSync: { type: Date, default: null },
});

module.exports = mongoose.model('RobloxUser', robloxUserSchema);
