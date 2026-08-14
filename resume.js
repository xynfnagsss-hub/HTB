const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume paused music playback'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    if (!queue.paused) return interaction.reply({ content: '⚠️ Playback is not paused.', ephemeral: true });
    queue.resume();
    await interaction.reply('▶️ Playback resumed.');
  },

  async prefixExecute(message, args, client) {
    const queue = client.distube.getQueue(message.guildId);
    if (!queue) return message.reply('❌ Nothing is playing right now.');
    if (!queue.paused) return message.reply('⚠️ Playback is not paused.');
    queue.resume();
    await message.reply('▶️ Playback resumed.');
  }
};
