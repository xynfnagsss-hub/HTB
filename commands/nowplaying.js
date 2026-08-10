const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Display the currently playing song details'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs.length) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    const song = queue.songs[0];
    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('🎵 Now Playing')
      .setDescription(`**[${song.name}](${song.url})**`)
      .addFields(
        { name: 'Progress', value: `\`${queue.formattedCurrentTime} / ${song.formattedDuration}\``, inline: true },
        { name: 'Requested By', value: `<@${song.user.id}>`, inline: true },
        { name: 'Volume', value: `${queue.volume}%`, inline: true }
      )
      .setThumbnail(song.thumbnail)
      .setFooter({ text: 'HTB Music' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    const queue = client.distube.getQueue(message.guildId);
    if (!queue || !queue.songs.length) {
      return message.reply('❌ Nothing is playing right now.');
    }

    const song = queue.songs[0];
    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('🎵 Now Playing')
      .setDescription(`**[${song.name}](${song.url})**`)
      .addFields(
        { name: 'Progress', value: `\`${queue.formattedCurrentTime} / ${song.formattedDuration}\``, inline: true },
        { name: 'Requested By', value: `<@${song.user.id}>`, inline: true },
        { name: 'Volume', value: `${queue.volume}%`, inline: true }
      )
      .setThumbnail(song.thumbnail)
      .setFooter({ text: 'HTB Music' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
};
