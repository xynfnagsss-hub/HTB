const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member for a specified duration')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to mute').setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('duration').setDescription('Duration in minutes (max 40320)').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the mute').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot mute yourself.', ephemeral: true });

    try {
      await target.timeout(duration * 60 * 1000, `${reason} | Muted by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setTitle('🔇 Member Muted')
        .addFields(
          { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Duration', value: `${duration} minute(s)`, inline: true },
          { name: 'Reason', value: reason },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to mute that user.', ephemeral: true });
    }
  },
};
