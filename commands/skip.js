const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MusicManager } = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the currently playing song'),

  async execute(interaction) {
    const musicManager = new MusicManager(interaction.client);
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Nothing is currently playing.', ephemeral: true });
    }

    const skipped = queue.skip();
    const embed = new EmbedBuilder()
      .setColor(0x5765f2)
      .setTitle('⏭️ Song Skipped')
      .setDescription(skipped ? `Skipped: **${skipped.title}**` : 'Skipped current track.')
      .setFooter({ text: `Skipped by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    const musicManager = new MusicManager(client);
    const queue = musicManager.getQueue(message.guild.id);

    if (!queue || !queue.currentTrack) {
      return message.reply('❌ Nothing is currently playing.');
    }

    const skipped = queue.skip();
    const embed = new EmbedBuilder()
      .setColor(0x5765f2)
      .setTitle('⏭️ Song Skipped')
      .setDescription(skipped ? `Skipped: **${skipped.title}**` : 'Skipped current track.')
      .setFooter({ text: `Skipped by ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
