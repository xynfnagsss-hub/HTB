const { EmbedBuilder } = require('discord.js');
const { getUser, XP_PER_LEVEL } = require('../data/levels');

module.exports = {
  name: 'level',
  description: 'Check your level and XP',
  usage: '.level [@user]',
  async execute(message, args) {
    const target = message.mentions.members.first() || message.member;
    const userData = await getUser(target.id);

    const xpForNext = (target.level + 1) * XP_PER_LEVEL;
    const xpNeeded = (userData.level + 1) * XP_PER_LEVEL - userData.xp;
    const nextMilestone = Math.ceil((userData.level + 1) / 15) * 15;
    const levelsUntilRobux = nextMilestone - userData.level;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`📊 ${target.user.username}'s Level`)
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Level', value: `${userData.level}`, inline: true },
        { name: 'XP', value: `${userData.xp}`, inline: true },
        { name: 'XP to Next Level', value: `${xpNeeded}`, inline: true },
        { name: 'Robux Earned', value: `💰 ${userData.robux} Robux`, inline: true },
        { name: 'Next Robux Milestone', value: `Level ${nextMilestone} (${levelsUntilRobux} levels away)`, inline: true },
      )
      .setFooter({ text: 'Every 15 levels = +100 Robux • HTB | Hit The Block' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};
