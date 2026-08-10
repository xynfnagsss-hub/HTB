const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause music playback'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    if (queue.paused) return interaction.reply({ content: '⚠️ Playback is already paused. Use `/resume` to continue.', ephemeral: true });
    queue.pause();
    await interaction.reply('⏸️ Playback paused.');
  },

  async prefixExecute(message, args, client) {
    const queue = client.distube.getQueue(message.guildId);
    if (!queue) return message.reply('❌ Nothing is playing right now.');
    if (queue.paused) return message.reply('⚠️ Playback is already paused. Use `.resume` to continue.');
    queue.pause();
    await message.reply('⏸️ Playback paused.');
  }
};
