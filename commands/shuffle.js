const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the songs in the queue'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue || queue.songs.length <= 1) {
      return interaction.reply({ content: '❌ Not enough songs in the queue to shuffle.', ephemeral: true });
    }

    await queue.shuffle();
    await interaction.reply('🔀 Queue shuffled successfully!');
  },

  async prefixExecute(message, args, client) {
    const queue = client.distube.getQueue(message.guildId);
    if (!queue || queue.songs.length <= 1) {
      return message.reply('❌ Not enough songs in the queue to shuffle.');
    }

    await queue.shuffle();
    await message.reply('🔀 Queue shuffled successfully!');
  }
};
