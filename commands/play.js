const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'play',
  description: 'Search YouTube and play a song in your voice channel',
  usage: '.play <song name or URL>',

  async execute(message, args) {
    // Must be in a voice channel
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('❌ You need to be in a voice channel first.');
    }

    // Need bot permissions
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return message.reply('❌ I need **Connect** and **Speak** permissions in your voice channel.');
    }

    if (!args.length) {
      return message.reply('❌ Please provide a song name or URL. Usage: `.play <song>`');
    }

    const query = args.join(' ');
    const searching = await message.reply(`🔍 Searching for **${query}**...`);

    try {
      let videoUrl;
      let videoTitle;
      let videoDuration;
      let videoThumbnail;

      // Check if it's already a YouTube URL
      if (play.yt_validate(query) === 'video') {
        const info = await play.video_info(query);
        videoUrl = query;
        videoTitle = info.video_details.title;
        videoDuration = info.video_details.durationRaw;
        videoThumbnail = info.video_details.thumbnails?.[0]?.url;
      } else {
        // Search YouTube
        const results = await play.search(query, { limit: 1 });
        if (!results || results.length === 0) {
          return searching.edit('❌ No results found for that search.');
        }
        const video = results[0];
        videoUrl = video.url;
        videoTitle = video.title;
        videoDuration = video.durationRaw;
        videoThumbnail = video.thumbnails?.[0]?.url;
      }

      // Get stream
      const stream = await play.stream(videoUrl, { quality: 2 });
      const resource = createAudioResource(stream.stream, { inputType: stream.type });

      // Join VC
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 10_000);

      const player = createAudioPlayer();
      connection.subscribe(player);
      player.play(resource);

      // Now playing embed
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${videoTitle}](${videoUrl})**`)
        .addFields({ name: 'Duration', value: videoDuration || 'Unknown', inline: true })
        .setThumbnail(videoThumbnail || null)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      await searching.edit({ content: '', embeds: [embed] });

      // Leave when song ends or errors
      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      player.on('error', (err) => {
        console.error('[PLAY ERROR]', err);
        connection.destroy();
        message.channel.send('❌ An error occurred while playing the song.').catch(() => {});
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          connection.destroy();
        }
      });

    } catch (err) {
      console.error('[PLAY ERROR]', err);
      searching.edit('❌ Something went wrong. Make sure the song name is valid and try again.').catch(() => {});
    }
  },
};
