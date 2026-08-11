const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { ensureNativeAutoModRule } = require('../utils/ensureAutoModRule');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Deploy or check Discord Native AutoMod Anti-Ping Protection')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  async execute(interaction) {
    const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id);
    if (!isBypass && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: '❌ Manage Server permission required.', ephemeral: true });
    }

    await interaction.deferReply();
    const result = await ensureNativeAutoModRule(interaction.guild);

    if (result.success) {
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🛡️ Discord Native AutoMod Active')
        .setDescription(
          `Official Discord AutoMod rule **"HTB Anti-Ping Protection"** is fully deployed and active!\n\n` +
          `• **Protected Owners**: <@674218467041345536>, <@1508174981396168755>\n` +
          `• **Action**: Automatic Discord Message Block with warning\n` +
          `• **Status**: ✅ Enabled (Network Level Blocking)`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({ content: `❌ AutoMod Setup failed: \`${result.reason}\`` });
    }
  },

  async prefixExecute(message, args) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ Manage Server permission required.');
    }

    const statusMsg = await message.channel.send('⚙️ Deploying Discord Native AutoMod Anti-Ping rule...');
    const result = await ensureNativeAutoModRule(message.guild);

    if (result.success) {
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('🛡️ Discord Native AutoMod Active')
        .setDescription(
          `Official Discord AutoMod rule **"HTB Anti-Ping Protection"** is fully deployed and active!\n\n` +
          `• **Protected Owners**: <@674218467041345536>, <@1508174981396168755>\n` +
          `• **Action**: Automatic Discord Message Block with warning\n` +
          `• **Status**: ✅ Enabled (Network Level Blocking)`
        )
        .setTimestamp();

      await statusMsg.edit({ content: '', embeds: [embed] });
    } else {
      await statusMsg.edit(`❌ AutoMod Setup failed: \`${result.reason}\``);
    }
  },
};
