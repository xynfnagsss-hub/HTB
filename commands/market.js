const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'market',
  description: 'Display HTB role prices',
  usage: '.market',
  async execute(message) {
    const embed = new EmbedBuilder()
      .setTitle('💰 HTB (HIT THE BLOCK) PRICES')
      .setColor(0x000000)
      .setDescription('> **Purchase any role below by opening a ticket!**')
      .addFields(
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🏷️ **@HTB | Noted Member — $2**\n' +
            '🎨 **CUSTOM ROLE — $3**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🔓 **@HTB | Half Access — $5**\n' +
            '🔑 **@HTB | Hitta Access — $7**\n' +
            '⚡ **@HTB | ONE-TAP ACCESS — $9**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🛡️ **@HTB | CHAT/VC MOD *(CANT SELL)* — $22**\n' +
            '🎫 **@HTB | Ticket Support — $25**\n' +
            '⚙️ **@HTB | Administrator *(CANT SELL)* — $32**\n' +
            '📋 **@HTB | Lead Moderator *(CANT SELL)* — $38**\n' +
            '📊 **@HTB | Ranking Staff — $44**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '👁️ **@HTB | OVERSEER — $49**\n' +
            '🪖 **@HTB | Sergeant — $75**\n' +
            '🎖️ **@HTB | Command Officer — $80**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '🥉 **@HTB | Third in Command — $123**\n' +
            '🥈 **@HTB | Second in Command — $150**\n' +
            '🥇 **@HTB | First in Command — $175**',
        },
        {
          name: '━━━━━━━━━━━━━━━━━━━━━━━',
          value:
            '> ❌ **NO REFUNDS**\n' +
            '> 🎫 **Make a ticket in <#TICKETS_CHANNEL_ID> to buy**\n' +
            '> **@everyone @HTB Members**',
        },
      )
      .setFooter({ text: 'HTB | Hit The Block' })
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
