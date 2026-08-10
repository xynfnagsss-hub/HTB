const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MusicManager } = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the current queue'),

  async execute(interaction) {
    const musicManager = new MusicManager(interaction.client);
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || queue.tracks.length < 2) {
      return interaction.reply({ content: '❌ Need at least 2 songs in the queue to shuffle.', ephemeral: true });
    }

    // Fisher-Yates shuffle
    for (let i = queue.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
    }

    const embed = new EmbedBuilder()
      .setColor(0x5765f2)
      .setTitle('🔀 Queue Shuffled')
      .setDescription(`Successfully shuffled **${queue.tracks.length}** tracks in the queue!`)
      .setFooter({ text: `Shuffled by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    const musicManager = new MusicManager(client);
    const queue = musicManager.getQueue(message.guild.id);

    if (!queue || queue.tracks.length < 2) {
      return message.reply('❌ Need at least 2 songs in the queue to shuffle.');
    }

    for (let i = queue.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
    }

    const embed = new EmbedBuilder()
      .setColor(0x5765f2)
      .setTitle('🔀 Queue Shuffled')
      .setDescription(`Successfully shuffled **${queue.tracks.length}** tracks in the queue!`)
      .setFooter({ text: `Shuffled by ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
