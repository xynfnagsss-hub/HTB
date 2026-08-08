const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete messages from this channel')
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');

    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await interaction.channel.bulkDelete(amount, true);

      await interaction.editReply({ content: `🗑️ Deleted **${deleted.size}** message(s).` });
    } catch (err) {
      console.error(err);
      await interaction.editReply({ content: '❌ Failed to delete messages. Messages older than 14 days cannot be bulk deleted.' });
    }
  },
};
