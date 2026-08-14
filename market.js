const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'market',
  description: 'Display TMN role prices',
  usage: '.market',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('💰 TMN (HIT THE BLOCK) PRICES')
      .setColor(0x000000)
      .setDescription('> **Purchase any role below by opening a ticket!**')
      .addFields(
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🏷️ **@TMN | Noted Member — $2**\n' +
            '🎨 **CUSTOM ROLE — $3**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🔓 **@TMN | Half Access — $5**\n' +
            '🔑 **@TMN | Hitta Access — $7**\n' +
            '⚡ **@TMN | ONE-TAP ACCESS — $9**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🛡️ **@TMN | CHAT/VC MOD *(CANT SELL)* — $22**\n' +
            '🎫 **@TMN | Ticket Support — $25**\n' +
            '⚙️ **@TMN | Administrator *(CANT SELL)* — $32**\n' +
            '📋 **@TMN | Lead Moderator *(CANT SELL)* — $38**\n' +
            '📊 **@TMN | Ranking Staff — $44**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '👁️ **@TMN | OVERSEER — $49**\n' +
            '🪖 **@TMN | Sergeant — $75**\n' +
            '🎖️ **@TMN | Command Officer — $80**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🥉 **@TMN | Third in Command — $123**\n' +
            '🥈 **@TMN | Second in Command — $150**\n' +
            '🥇 **@TMN | First in Command — $175**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '> ❌ **NO REFUNDS**\n' +
            '> 🎫 **Make a ticket in <#TICKETS_CHANNEL_ID> to buy**\n' +
            '> **@everyone @TMN Members**',
        },
      )
      .setFooter({ text: 'TMN | Trust No Mob' })
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
