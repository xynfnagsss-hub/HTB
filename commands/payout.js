const { EmbedBuilder } = require('discord.js');
const { getUser } = require('../data/levels');

module.exports = {
  name: 'payout',
  description: 'Check how much Robux a user has earned',
  usage: '.payout @user',
  async execute(message, args) {
    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user. Usage: `.payout @user`');

    const userData = await getUser(target.id);

    const embed = new EmbedBuilder()
      .setColor(0x00cc44)
      .setTitle('💰 Payout Info')
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User', value: `${target.user.tag}`, inline: true },
        { name: 'Level', value: `${userData.level}`, inline: true },
        { name: 'XP', value: `${userData.xp}`, inline: true },
        { name: 'Robux Earned', value: `💰 ${userData.robux} Robux`, inline: false },
      )
      .setFooter({ text: 'HTB | Hit The Block — Payout System' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};
