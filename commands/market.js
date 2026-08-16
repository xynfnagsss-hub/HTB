const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'market',
  description: 'Display TNM role prices',
  usage: '.market',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('💰 TNM PRICES')
      .setColor(0x000000)
      .setDescription('> **Purchase any role below by opening a ticket!**')
      .addFields(
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🏷️ **@TNM | Noted Member — $2**\n' +
            '🎨 **CUSTOM ROLE — $3**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🔓 **@TNM | Half Access — $5**\n' +
            '🔑 **@TNM | Hitta Access — $7**\n' +
            '⚡ **@TNM | ONE-TAP ACCESS — $9**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🛡️ **@TNM | CHAT/VC MOD *(CANT SELL)* — $22**\n' +
            '🎫 **@TNM | Ticket Support — $25**\n' +
            '⚙️ **@TNM | Administrator *(CANT SELL)* — $32**\n' +
            '📋 **@TNM | Lead Moderator *(CANT SELL)* — $38**\n' +
            '📊 **@TNM | Ranking Staff — $44**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '👁️ **@TNM | OVERSEER — $49**\n' +
            '🪖 **@TNM | Sergeant — $75**\n' +
            '🎖️ **@TNM | Command Officer — $80**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🥉 **@TNM | Third in Command — $123**\n' +
            '🥈 **@TNM | Second in Command — $150**\n' +
            '🥇 **@TNM | First in Command — $175**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '> ❌ **NO REFUNDS**\n' +
            '> 🎫 **Make a ticket in <#TICKETS_CHANNEL_ID> to buy**\n' +
            '> **@everyone @TNM Members**',
        },
      )
      .setFooter({ text: 'TNM Community' })
      .setTimestamp();

    try {
      await message.delete().catch(() => {});
      await message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      message.reply('❌ Failed to send the market embed.');
    }
  },
};
