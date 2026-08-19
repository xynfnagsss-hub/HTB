const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'or',
  description: 'Display TNM access tier prices (Boss, Enforcer, Street, Elite)',
  usage: '.or',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('💳 TNM ACCESS TIER PRICES')
      .setColor(0x000000)
      .setDescription('> **Unlock access passes instantly by opening a ticket or buying online!**')
      .addFields(
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🏷️ **@TNM | Street Access — $2**\n' +
            '🔓 **@TNM | Enforcer Access — $5**\n' +
            '🔑 **@TNM | Boss Access — $7**\n' +
            '⚡ **@TNM | TNM Elite — $9**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '> ❌ **NO REFUNDS**\n' +
            '> 🎫 **Make a ticket in <#TICKETS_CHANNEL_ID> to buy**\n' +
            '> 🌐 **Purchase Online:** [www.shoptnm.org](https://www.shoptnm.org/)\n' +
            '> **@everyone @TNM Members**',
        }
      )
      .setFooter({ text: 'TNM Access Management' })
      .setTimestamp();

    try {
      await message.delete().catch(() => {});
      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      message.reply('❌ Failed to send the access prices embed.');
    }
  },
};
