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
      .setColor(0xED4245)
      .setTitle('🛡️ Anti-Ping Protection Status')
      .setDescription('❌ **Anti-ping protection is permanently deactivated.** Users can ping and mention all administrators and owners freely.')
      .setFooter({ text: 'TNM Security System' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ You do not have permission to view server settings.');
    }

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🛡️ Anti-Ping Protection Status')
      .setDescription('❌ **Anti-ping protection is permanently deactivated.** Users can ping and mention all administrators and owners freely.')
      .setFooter({ text: 'TNM Security System' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
