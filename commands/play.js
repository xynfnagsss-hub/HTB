const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
} = require('@discordjs/voice');
const ytdl = require('@distube/ytdl-core');
const { EmbedBuilder } = require('discord.js');

// Search YouTube without API key using a simple fetch
async function searchYouTube(query) {
  const encoded = encodeURIComponent(query);
  const url = `https://www.youtube.com/results?search_query=${encoded}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    },
  });
  const html = await res.text();
  // Extract first video ID from ytInitialData
  const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
  if (!match) return null;
  return `https://www.youtube.com/watch?v=${match[1]}`;
}

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
      // Resolve URL
      let videoUrl;
      if (ytdl.validateURL(query)) {
        videoUrl = query;
      } else {
        videoUrl = await searchYouTube(query);
        if (!videoUrl) {
          return searching.edit('❌ No results found for that search.');
        }
      }

      // Get video info
      const info = await ytdl.getInfo(videoUrl);
      const videoTitle = info.videoDetails.title;
      const videoDuration = formatDuration(parseInt(info.videoDetails.lengthSeconds));
      const videoThumbnail = info.videoDetails.thumbnails?.at(-1)?.url;

      // Join VC
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

      // Create stream
      const stream = ytdl(videoUrl, {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
      });

      const resource = createAudioResource(stream, {
        inputType: StreamType.Arbitrary,
      });

      const player = createAudioPlayer();
      connection.subscribe(player);
      player.play(resource);

      // Now playing embed
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${videoTitle}](${videoUrl})**`)
        .addFields({ name: 'Duration', value: videoDuration, inline: true })
        .setThumbnail(videoThumbnail || null)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      await searching.edit({ content: '', embeds: [embed] });

      // Leave when song ends
      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      player.on('error', (err) => {
        console.error('[PLAY ERROR]', err.message);
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
      console.error('[PLAY ERROR]', err.message);
      searching.edit(`❌ Something went wrong: \`${err.message}\``).catch(() => {});
    }
  },
};

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
