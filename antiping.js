const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { DEFAULT_PROTECTED_USER_IDS } = require('../utils/ensureAutoModRule');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiping')
    .setDescription('View Anti-Ping protection status')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  async execute(interaction) {
    const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id);
    if (!isBypass && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: '❌ You do not have permission to view server settings.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🛡️ Anti-Ping Protection Status')
      .setDescription('Direct `@` mentions of protected users are automatically filtered. **Message replies are 100% permitted.**')
      .addFields(
        { name: 'Protected Users', value: DEFAULT_PROTECTED_USER_IDS.map(id => `<@${id}> (\`${id}\`)`).join('\n') },
        { name: 'Replies Status', value: '✅ **Allowed** (Users can reply freely)' },
        { name: 'Direct @ Mentions', value: '🚫 **Filtered** (Manual @ pings removed)' }
      )
      .setFooter({ text: 'TMN Security System' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ You do not have permission to view server settings.');
    }

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🛡️ Anti-Ping Protection Status')
      .setDescription('Direct `@` mentions of protected users are automatically filtered. **Message replies are 100% permitted.**')
      .addFields(
        { name: 'Protected Users', value: DEFAULT_PROTECTED_USER_IDS.map(id => `<@${id}> (\`${id}\`)`).join('\n') },
        { name: 'Replies Status', value: '✅ **Allowed** (Users can reply freely)' },
        { name: 'Direct @ Mentions', value: '🚫 **Filtered** (Manual @ pings removed)' }
      )
      .setFooter({ text: 'TMN Security System' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
