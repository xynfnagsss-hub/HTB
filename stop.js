const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music playback and clear the queue'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }
    await queue.stop();
    await interaction.reply('⏹️ Music stopped and queue cleared.');
  },

  async prefixExecute(message, args, client) {
    const queue = client.distube.getQueue(message.guildId);
    if (!queue) {
      return message.reply('❌ Nothing is playing right now.');
    }
    await queue.stop();
    await message.reply('⏹️ Music stopped and queue cleared.');
  }
};
