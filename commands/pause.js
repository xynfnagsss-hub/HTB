const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MusicManager } = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current music playback'),

  async execute(interaction) {
    const musicManager = new MusicManager(interaction.client);
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    if (queue.isPaused) {
      return interaction.reply({ content: '⏸️ Playback is already paused.', ephemeral: true });
    }

    queue.pause();
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle('⏸️ Playback Paused')
      .setDescription('Use `/resume` or `.resume` to continue playing.')
      .setFooter({ text: `Paused by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    const musicManager = new MusicManager(client);
    const queue = musicManager.getQueue(message.guild.id);

    if (!queue || !queue.currentTrack) {
      return message.reply('❌ Nothing is playing right now.');
    }

    if (queue.isPaused) {
      return message.reply('⏸️ Playback is already paused.');
    }

    queue.pause();
    const embed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setTitle('⏸️ Playback Paused')
      .setDescription('Use `.resume` to continue playing.')
      .setFooter({ text: `Paused by ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
