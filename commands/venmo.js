const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'venmo',
  description: 'Display TNM Venmo payment info',
  usage: '.venmo',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('💸 TNM PAYMENT INFO')
      .setColor(0x008cff)
      .setDescription(
        '**Send payment via Venmo:**\n\n' +
        '> 💳 **Venmo: @sophiaahmed1**\n\n' +
        '> ❌ **NO REFUNDS**\n' +
        '> 🎫 Open a ticket after paying to claim your role'
      )
      .setFooter({ text: 'TNM Community' })
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
