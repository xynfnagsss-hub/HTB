const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MusicManager } = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song, playlist, artist, or URL in your voice channel')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Song title, YouTube/SoundCloud URL, or artist')
        .setRequired(true)),

  async execute(interaction) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ You must join a voice channel first.', ephemeral: true });
    }

    const permissions = voiceChannel.permissionsFor(interaction.client.user);
    if (!permissions || !permissions.has('Connect') || !permissions.has('Speak')) {
      return interaction.reply({ content: '❌ I do not have permission to connect and speak in your voice channel.', ephemeral: true });
    }

    const query = interaction.options.getString('query').trim();
    await interaction.deferReply();

    const musicManager = new MusicManager(interaction.client);
    const queue = musicManager.getOrCreateQueue(interaction.guild, voiceChannel, interaction.channel);

    try {
      const result = await musicManager.resolveSearch(query, interaction.user);

      if (result.isPlaylist) {
        for (const t of result.tracks) {
          queue.tracks.push(t);
        }

        const embed = new EmbedBuilder()
          .setColor(0x5765f2)
          .setTitle('📑 Playlist Added to Queue')
          .setDescription(`Added **${result.tracks.length}** tracks from **${result.playlistTitle}**`)
          .setFooter({ text: `Requested by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        if (!queue.isPlaying) {
          await queue.playNext();
        }
        return;
      }

      const track = result.tracks[0];
      if (queue.isPlaying || queue.currentTrack) {
        queue.tracks.push(track);
        const position = queue.tracks.length;

        const embed = new EmbedBuilder()
          .setColor(0x5765f2)
          .setTitle('➕ Added to Queue')
          .setDescription(`**[${track.title}](${track.url})**`)
          .addFields(
            { name: 'Duration', value: track.duration, inline: true },
            { name: 'Position in Queue', value: `#${position}`, inline: true },
          )
          .setThumbnail(track.thumbnail)
          .setFooter({ text: `Requested by ${interaction.user.tag}` })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        queue.tracks.push(track);
        await interaction.editReply({ content: `🔍 Found **${track.title}**! Starting playback...` });
        await queue.playNext();
      }
    } catch (err) {
      console.error('[PLAY ERROR /play]:', err);
      interaction.editReply({ content: `❌ Error: ${err.message || 'Could not find or play track.'}` }).catch(() => {});
    }
  },

  async prefixExecute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('❌ You must join a voice channel first.');
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions || !permissions.has('Connect') || !permissions.has('Speak')) {
      return message.reply('❌ I do not have permission to connect and speak in your voice channel.');
    }

    if (!args.length) {
      return message.reply('❌ Usage: `.play <song title, artist, or URL>`');
    }

    const query = args.join(' ').trim();
    const statusMsg = await message.channel.send(`🔍 Searching for **${query}**...`);

    const musicManager = new MusicManager(client);
    const queue = musicManager.getOrCreateQueue(message.guild, voiceChannel, message.channel);

    try {
      const result = await musicManager.resolveSearch(query, message.author);

      if (result.isPlaylist) {
        for (const t of result.tracks) {
          queue.tracks.push(t);
        }

        const embed = new EmbedBuilder()
          .setColor(0x5765f2)
          .setTitle('📑 Playlist Added to Queue')
          .setDescription(`Added **${result.tracks.length}** tracks from **${result.playlistTitle}**`)
          .setFooter({ text: `Requested by ${message.author.tag}` })
          .setTimestamp();

        await statusMsg.edit({ content: '', embeds: [embed] });

        if (!queue.isPlaying) {
          await queue.playNext();
        }
        return;
      }

      const track = result.tracks[0];
      if (queue.isPlaying || queue.currentTrack) {
        queue.tracks.push(track);
        const position = queue.tracks.length;

        const embed = new EmbedBuilder()
          .setColor(0x5765f2)
          .setTitle('➕ Added to Queue')
          .setDescription(`**[${track.title}](${track.url})**`)
          .addFields(
            { name: 'Duration', value: track.duration, inline: true },
            { name: 'Position in Queue', value: `#${position}`, inline: true },
          )
          .setThumbnail(track.thumbnail)
          .setFooter({ text: `Requested by ${message.author.tag}` })
          .setTimestamp();

        await statusMsg.edit({ content: '', embeds: [embed] });
      } else {
        queue.tracks.push(track);
        await statusMsg.edit({ content: `🎶 Loading **${track.title}**...` });
        await queue.playNext();
      }
    } catch (err) {
      console.error('[PLAY ERROR .play]:', err);
      statusMsg.edit(`❌ Playback failed: \`${err.message || 'Could not find or play track.'}\``).catch(() => {});
    }
  },
};
