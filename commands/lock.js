const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel so only staff can send messages')
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for locking').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),

  async execute(interaction) {
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
      });

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🔒 Channel Locked')
        .setDescription(`This channel has been locked.\n**Reason:** ${reason}`)
        .setFooter({ text: `Locked by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to lock the channel.', ephemeral: true });
    }
  },
};
