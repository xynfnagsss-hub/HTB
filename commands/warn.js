const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

const warnings = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member and log it')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the warning').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  warnings,

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot warn yourself.', ephemeral: true });

    const key = `${interaction.guild.id}-${target.id}`;
    if (!warnings.has(key)) warnings.set(key, []);
    warnings.get(key).push({ reason, mod: interaction.user.tag, date: new Date().toISOString() });

    const totalWarns = warnings.get(key).length;

    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle('⚠️ You have been warned')
          .setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}\n**Total Warnings:** ${totalWarns}`)
          .setTimestamp(),
      ],
    }).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle('⚠️ Member Warned')
      .addFields(
        { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Total Warnings', value: `${totalWarns}`, inline: true },
        { name: 'Reason', value: reason },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
