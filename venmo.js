const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'venmo',
  description: 'Display TMN Venmo payment info',
  usage: '.venmo',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('💸 TMN PAYMENT INFO')
      .setColor(0x008cff)
      .setDescription(
        '**Send payment via Venmo:**\n\n' +
        '> 💳 **Venmo: @sophiaahmed1**\n\n' +
        '> ❌ **NO REFUNDS**\n' +
        '> 🎫 Open a ticket after paying to claim your role'
      )
      .setFooter({ text: 'TMN | Trust No Mob' })
      .setTimestamp();

    try {
      await message.delete().catch(() => {});
      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      message.reply('❌ Failed to send the Venmo embed.');
    }
  },
};
