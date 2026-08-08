const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const warnCommand = require('./warn');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a member')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

    const key = `${interaction.guild.id}-${target.id}`;
    const userWarnings = warnCommand.warnings.get(key) || [];

    if (userWarnings.length === 0) {
      return interaction.reply({ content: `✅ **${target.user.tag}** has no warnings.`, ephemeral: true });
    }

    const warnList = userWarnings
      .map((w, i) => `**${i + 1}.** ${w.reason} — by ${w.mod} on ${new Date(w.date).toLocaleDateString()}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle(`⚠️ Warnings for ${target.user.tag}`)
      .setDescription(warnList)
      .setFooter({ text: `Total: ${userWarnings.length} warning(s)` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
