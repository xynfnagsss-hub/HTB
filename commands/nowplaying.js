const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MusicManager } = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Display information about the currently playing song'),

  async execute(interaction) {
    const musicManager = new MusicManager(interaction.client);
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Nothing is currently playing.', ephemeral: true });
    }

    const embed = this.buildNPEmbed(queue);
    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    const musicManager = new MusicManager(client);
    const queue = musicManager.getQueue(message.guild.id);

    if (!queue || !queue.currentTrack) {
      return message.reply('❌ Nothing is currently playing.');
    }

    const embed = this.buildNPEmbed(queue);
    await message.reply({ embeds: [embed] });
  },

  buildNPEmbed(queue) {
    const track = queue.currentTrack;
    const embed = new EmbedBuilder()
      .setColor(0x5765f2)
      .setTitle('🎵 Now Playing')
      .setDescription(`**[${track.title}](${track.url})**`)
      .addFields(
        { name: 'Duration', value: track.duration || 'Unknown', inline: true },
        { name: 'Status', value: queue.isPaused ? '⏸️ Paused' : '▶️ Playing', inline: true },
        { name: 'Loop Mode', value: queue.loopMode.toUpperCase(), inline: true },
        { name: 'Requested By', value: track.requestedBy?.tag || 'User', inline: true },
        { name: 'Tracks in Queue', value: `${queue.tracks.length}`, inline: true },
      )
      .setThumbnail(track.thumbnail)
      .setTimestamp();

    return embed;
  },
};
