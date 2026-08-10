const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MusicManager } = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the current music queue'),

  async execute(interaction) {
    const musicManager = new MusicManager(interaction.client);
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      return interaction.reply({ content: '📭 The queue is currently empty.', ephemeral: true });
    }

    const embed = this.buildQueueEmbed(queue);
    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    const musicManager = new MusicManager(client);
    const queue = musicManager.getQueue(message.guild.id);

    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      return message.reply('📭 The queue is currently empty.');
    }

    const embed = this.buildQueueEmbed(queue);
    await message.reply({ embeds: [embed] });
  },

  buildQueueEmbed(queue) {
    const current = queue.currentTrack;
    const embed = new EmbedBuilder()
      .setColor(0x5765f2)
      .setTitle('🎶 Server Music Queue')
      .setTimestamp();

    if (current) {
      embed.addFields({
        name: '▶️ Now Playing',
        value: `**[${current.title}](${current.url})** | \`${current.duration}\`\n*Requested by:* ${current.requestedBy?.tag || 'User'}`,
      });
    }

    if (queue.tracks.length > 0) {
      const trackList = queue.tracks
        .slice(0, 10)
        .map((t, idx) => `\`${idx + 1}.\` **[${t.title}](${t.url})** | \`${t.duration}\` (Requested by ${t.requestedBy?.username || 'User'})`)
        .join('\n');

      const remaining = queue.tracks.length > 10 ? `\n*...and ${queue.tracks.length - 10} more track(s)*` : '';

      embed.addFields({
        name: `📑 Up Next (${queue.tracks.length} track${queue.tracks.length === 1 ? '' : 's'})`,
        value: trackList + remaining,
      });
    } else {
      embed.addFields({
        name: '📑 Up Next',
        value: '*No more tracks queued. Add more with `.play <song>`!*',
      });
    }

    embed.setFooter({ text: `Loop Mode: ${queue.loopMode.toUpperCase()} | Total Queue: ${queue.tracks.length + (current ? 1 : 0)} track(s)` });
    return embed;
  },
};
