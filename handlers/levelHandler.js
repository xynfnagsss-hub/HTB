const { EmbedBuilder } = require('discord.js');
const { addXP } = require('../data/levels');

// Cooldown to prevent XP spam (15 seconds per user)
const cooldowns = new Map();
const COOLDOWN_MS = 15000;

async function handleLevelXP(message) {
  if (message.author.bot) return;
  if (!message.guild) return;

  const userId = message.author.id;
  const now = Date.now();

  // Check cooldown
  if (cooldowns.has(userId) && now - cooldowns.get(userId) < COOLDOWN_MS) return;
  cooldowns.set(userId, now);

  const { leveledUp, newLevel, robuxEarned } = addXP(userId, message.author.username);

  if (!leveledUp) return;

  // Level up message
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('⬆️ Level Up!')
    .setDescription(`${message.author} reached **Level ${newLevel}**!`)
    .setTimestamp();

  // Robux milestone
  if (robuxEarned > 0) {
    embed
      .setColor(0x00cc44)
      .setTitle('🎉 Level Up + Robux Earned!')
      .setDescription(
        `${message.author} reached **Level ${newLevel}**!\n\n` +
        `💰 **+${robuxEarned} Robux** added to your payout balance!`
      );
  }

  message.channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { handleLevelXP };
