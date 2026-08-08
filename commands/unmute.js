const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout (unmute) from a member')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to unmute').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the unmute').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (!target.communicationDisabledUntil) return interaction.reply({ content: '❌ That user is not currently muted.', ephemeral: true });

    try {
      await target.timeout(null, `${reason} | Unmuted by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🔊 Member Unmuted')
        .addFields(
          { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to unmute that user.', ephemeral: true });
    }
  },
};
