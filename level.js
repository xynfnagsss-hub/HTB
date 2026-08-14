const { EmbedBuilder } = require('discord.js');
const { getUser, getLevelProgress } = require('../data/levels');

module.exports = {
  name: 'level',
  description: 'Check your level, XP progress, and rank card',
  usage: '.level [@user]',
  async execute(message, args) {
    const target = message.mentions.members.first() || message.member;
    const userData = await getUser(target.id);
    const progress = getLevelProgress(userData.xp || 0);

    const nextMilestone = Math.ceil((progress.currentLevel + 1) / 15) * 15;
    const levelsUntilRobux = nextMilestone - progress.currentLevel;

    // Progress Bar generator
    const totalBars = 12;
    const filledBars = Math.round((progress.progressPercent / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    const progressBar = '▰'.repeat(filledBars) + '▱'.repeat(emptyBars);

    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle(`📊 Rank Card: ${target.user.username}`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `**Level ${progress.currentLevel}** • \`${progress.xpInCurrentLevel.toLocaleString()} / ${progress.xpNeededForLevel.toLocaleString()} XP\` (${progress.progressPercent}%)\n` +
        `${progressBar}\n` +
        `\`${progress.xpRemaining.toLocaleString()}\` XP remaining to reach **Level ${progress.currentLevel + 1}**`
      )
      .addFields(
        { name: '⭐ Total XP', value: `\`${(userData.xp || 0).toLocaleString()}\` XP`, inline: true },
        { name: '💰 Robux Earned', value: `\`${userData.robux || 0}\` Robux`, inline: true },
        { name: '🎁 Next Milestone', value: `Level ${nextMilestone} (${levelsUntilRobux} lvl away)`, inline: true }
      )
      .setFooter({ text: 'Every 15 levels = +100 Robux • TNM | Trust No Mob', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};
