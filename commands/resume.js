const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MusicManager } = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume paused music playback'),

  async execute(interaction) {
    const musicManager = new MusicManager(interaction.client);
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    if (!queue.isPaused) {
      return interaction.reply({ content: '▶️ Playback is already active.', ephemeral: true });
    }

    queue.resume();
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('▶️ Playback Resumed')
      .setDescription(`Resumed playing: **${queue.currentTrack.title}**`)
      .setFooter({ text: `Resumed by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    const musicManager = new MusicManager(client);
    const queue = musicManager.getQueue(message.guild.id);

    if (!queue || !queue.currentTrack) {
      return message.reply('❌ Nothing is playing right now.');
    }

    if (!queue.isPaused) {
      return message.reply('▶️ Playback is already active.');
    }

    queue.resume();
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('▶️ Playback Resumed')
      .setDescription(`Resumed playing: **${queue.currentTrack.title}**`)
      .setFooter({ text: `Resumed by ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
