const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode on this channel')
    .addIntegerOption(opt =>
      opt.setName('seconds').setDescription('Slowmode in seconds (0 to disable, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');

    try {
      await interaction.channel.setRateLimitPerUser(seconds);

      await interaction.reply({
        content: seconds === 0
          ? `✅ Slowmode disabled in ${interaction.channel}.`
          : `✅ Slowmode set to **${seconds}s** in ${interaction.channel}.`,
        ephemeral: true,
      });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to set slowmode.', ephemeral: true });
    }
  },
};
