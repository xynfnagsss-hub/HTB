const { EmbedBuilder } = require('discord.js');
const { getUser } = require('../data/levels');

const STAFF_CHANNEL_ID = '1493405793326858270';

module.exports = {
  name: 'payout',
  description: 'Check how much Robux a user has earned (staff only)',
  usage: '.payout @user',
  async execute(message, args) {
    // Restrict to staff channel only
    if (message.channel.id !== STAFF_CHANNEL_ID) {
      return message.reply({ content: '❌ This command can only be used in the staff channel.', allowedMentions: { repliedUser: false } });
    }

    const target = message.mentions.members.first();
    if (!target) return message.reply('❌ Please mention a user. Usage: `.payout @user`');

    const userData = getUser(target.id);

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
