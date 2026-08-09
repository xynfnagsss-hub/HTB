const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(opt =>
      opt.setName('userid').setDescription('The user ID to unban').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the unban').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),

  async execute(interaction) {
    const userId = interaction.options.getString('userid');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    // Validate it's a valid ID
    if (!/^\d{17,20}$/.test(userId)) {
      return interaction.reply({ content: '❌ Please provide a valid user ID.', ephemeral: true });
    }

    try {
      // Fetch ban to confirm they're actually banned
      const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!ban) {
        return interaction.reply({ content: '❌ That user is not banned.', ephemeral: true });
      }

      await interaction.guild.members.unban(userId, `${reason} | Unbanned by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Member Unbanned')
        .addFields(
          { name: 'User', value: `${ban.user.tag} (${userId})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to unban that user.', ephemeral: true });
    }
  },
};
