const { EmbedBuilder } = require('discord.js');
const { addXP, getLevelProgress } = require('../data/levels');

// Cooldown to prevent XP spam (60 seconds per user)
const cooldowns = new Map();
const COOLDOWN_MS = 60_000;

async function handleLevelXP(message) {
  if (message.author.bot) return;
  if (!message.guild) return;

  const userId = message.author.id;
  const now = Date.now();

  // Check 1-minute cooldown
  if (cooldowns.has(userId) && now - cooldowns.get(userId) < COOLDOWN_MS) return;
  cooldowns.set(userId, now);

  // Random XP between 15 and 25 per message
  const gainedXP = Math.floor(Math.random() * 11) + 15;
  const { leveledUp, newLevel, robuxEarned, totalXP } = await addXP(userId, gainedXP);

  if (!leveledUp) return;

  const progress = getLevelProgress(totalXP);

  // Level up message
  const embed = new EmbedBuilder()
    .setColor(0xF5AF19) // Gold
    .setTitle('⬆️ LEVEL UP!')
    .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
    .setDescription(
      `🎉 Congratulations ${message.author}! You reached **Level ${newLevel}**!\n\n` +
      `📊 **Total XP**: \`${totalXP.toLocaleString()}\` XP\n` +
      `🎯 **Next Level Target**: \`${progress.nextLevelTotalXP.toLocaleString()}\` XP`
    )
    .setFooter({ text: 'HTB Leveling System • Hit The Block', iconURL: 'https://htbwshop.jo3.org/favicon.png' })
    .setTimestamp();

  // Robux milestone (every 15 levels)
  if (robuxEarned > 0) {
    embed
      .setColor(0x57F287)
      .setTitle('🎉 LEVEL UP + ROBUX EARNED!')
      .setDescription(
        `🏆 Huge milestone ${message.author}! You reached **Level ${newLevel}**!\n\n` +
        `💰 **+${robuxEarned} Robux** has been credited to your payout balance!`
      );
  }

  message.channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { handleLevelXP };
