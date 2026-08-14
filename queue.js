const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show current music queue'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs.length) {
      return interaction.reply({ content: '❌ The queue is currently empty.', ephemeral: true });
    }

    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1, 11).map((s, i) => `\`${i + 1}.\` **[${s.name}](${s.url})** - \`${s.formattedDuration}\``).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle(`🎵 Music Queue (${queue.songs.length} tracks)`)
      .setDescription(`**Now Playing:**\n🎶 **[${current.name}](${current.url})** - \`${current.formattedDuration}\`\n\n**Up Next:**\n${upcoming || '*No more tracks in queue.*'}`)
      .setFooter({ text: `Total Duration: ${queue.formattedDuration} • Loop: ${queue.repeatMode ? (queue.repeatMode === 2 ? 'Queue' : 'Song') : 'Off'}` });

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    const queue = client.distube.getQueue(message.guildId);
    if (!queue || !queue.songs.length) {
      return message.reply('❌ The queue is currently empty.');
    }

    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1, 11).map((s, i) => `\`${i + 1}.\` **[${s.name}](${s.url})** - \`${s.formattedDuration}\``).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle(`🎵 Music Queue (${queue.songs.length} tracks)`)
      .setDescription(`**Now Playing:**\n🎶 **[${current.name}](${current.url})** - \`${current.formattedDuration}\`\n\n**Up Next:**\n${upcoming || '*No more tracks in queue.*'}`)
      .setFooter({ text: `Total Duration: ${queue.formattedDuration} • Loop: ${queue.repeatMode ? (queue.repeatMode === 2 ? 'Queue' : 'Song') : 'Off'}` });

    await message.reply({ embeds: [embed] });
  }
};
