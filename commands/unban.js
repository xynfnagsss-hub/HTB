const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(opt =>
      opt.setName('user').setDescription('The user ID to unban (or mention)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the unban').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),

  async execute(interaction) {
    const rawUser = interaction.options.getString('user') || interaction.options.getString('userid') || '';
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const userId = rawUser.replace(/[^0-9]/g, '');

    // Validate ID length (Discord snowflakes are 17-20 digits)
    if (!userId || userId.length < 17 || userId.length > 20) {
      return interaction.reply({ content: '❌ Please provide a valid 17-20 digit user ID.', ephemeral: true });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: '❌ I do not have permission to unban members.', ephemeral: true });
    }

    try {
      // Fetch ban entry to verify the user is banned
      const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!ban) {
        return interaction.reply({ content: '❌ That user is not currently banned in this server.', ephemeral: true });
      }

      await interaction.guild.members.unban(userId, `${reason} | Unbanned by ${interaction.user.tag}`);

      const userDisplay = ban.user ? `${ban.user.tag} (${userId})` : userId;

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Member Unbanned')
        .addFields(
          { name: 'User', value: userDisplay, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[UNBAN ERROR]', err);
      interaction.reply({ content: '❌ Failed to unban that user. Please verify my permissions and try again.', ephemeral: true });
    }
  },
};
