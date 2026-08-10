const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const yts = require('yt-search');
const play = require('play-dl');

let scClientInit = false;
async function ensureSoundCloud() {
  if (!scClientInit) {
    try {
      const cid = await play.getFreeClientID().catch(() => null);
      if (cid) {
        await play.setToken({ soundcloud: { client_id: cid } });
        scClientInit = true;
      }
    } catch (e) {
      console.warn('[SoundCloud Init]', e.message);
    }
  }
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const s = Math.floor(Number(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function extractYouTubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

async function resolveAudio(query) {
  await ensureSoundCloud();

  const isUrl = /^https?:\/\//i.test(query);
  let title = query;
  let trackUrl = query;
  let duration = '0:00';
  let thumbnail = null;
  let searchTitle = query;

  // 1. Direct Spotify URL
  if (isUrl && query.includes('spotify.com')) {
    try {
      if (play.is_expired()) await play.refreshToken().catch(() => {});
      const sp = await play.spotify(query);
      title = `${sp.name} - ${sp.artists?.map(a => a.name).join(', ') || ''}`;
      searchTitle = `${sp.name} ${sp.artists?.[0]?.name || ''}`;
      duration = formatDuration(sp.durationInSec);
      thumbnail = sp.thumbnail?.url || null;
      trackUrl = query;
    } catch (e) {
      console.warn('[Spotify Resolve]', e.message);
    }
  }
  // 2. Direct SoundCloud URL
  else if (isUrl && query.includes('soundcloud.com')) {
    try {
      const sc = await play.soundcloud(query);
      title = sc.name || query;
      searchTitle = sc.name || query;
      duration = formatDuration(sc.durationInSec);
      thumbnail = sc.thumbnail || null;
      trackUrl = query;

      const scStream = await play.stream(query);
      const resource = createAudioResource(scStream.stream, { inputType: scStream.type });
      return { resource, title, trackUrl, duration, thumbnail };
    } catch (e) {
      console.warn('[SoundCloud URL Resolve]', e.message);
    }
  }
  // 3. Direct YouTube URL
  else if (isUrl && (query.includes('youtube.com') || query.includes('youtu.be'))) {
    const videoId = extractYouTubeId(query);
    if (videoId) {
      try {
        const ytData = await yts({ videoId }).catch(() => null);
        if (ytData) {
          title = ytData.title;
          searchTitle = `${ytData.title} ${ytData.author?.name || ''}`;
          duration = ytData.timestamp || '0:00';
          thumbnail = ytData.thumbnail || null;
          trackUrl = ytData.url;
        }
      } catch (e) {
        console.warn('[YouTube URL Resolve]', e.message);
      }
    }
  }
  // 4. Text Search Query (e.g. ".play 4 big guys")
  else {
    try {
      const searchRes = await yts(query);
      if (searchRes && searchRes.videos && searchRes.videos.length > 0) {
        const bestVideo = searchRes.videos[0];
        title = bestVideo.title;
        searchTitle = `${bestVideo.title} ${bestVideo.author?.name || ''}`;
        duration = bestVideo.timestamp || '0:00';
        thumbnail = bestVideo.thumbnail || null;
        trackUrl = bestVideo.url;
      }
    } catch (e) {
      console.warn('[YouTube Search Resolve]', e.message);
    }
  }

  // 5. Stream Audio: Search SoundCloud with exact resolved song title (100% reliable on datacenter IPs)
  let streamInfo;
  try {
    const scResults = await play.search(searchTitle, { source: { soundcloud: 'tracks' }, limit: 1 });
    if (scResults && scResults.length > 0) {
      streamInfo = await play.stream(scResults[0].url);
      if (!thumbnail) thumbnail = scResults[0].thumbnail || null;
    }
  } catch (scErr) {
    console.warn('[SoundCloud Stream Fallback]', scErr.message);
  }

  // Fallback to direct stream if SoundCloud search had no result
  if (!streamInfo && trackUrl && isUrl) {
    try {
      streamInfo = await play.stream(trackUrl);
    } catch (ytStreamErr) {
      console.warn('[Direct Stream Fallback]', ytStreamErr.message);
    }
  }

  if (!streamInfo) {
    throw new Error('Could not extract a playable audio stream for this track.');
  }

  const resource = createAudioResource(streamInfo.stream, {
    inputType: streamInfo.type,
  });

  return { resource, title, trackUrl, duration, thumbnail };
}

module.exports = {
  name: 'play',
  description: 'Play music in your voice channel with precise search and direct URL support',
  usage: '.play <song title or URL>',

  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('❌ You must join a voice channel first.');
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions || !permissions.has('Connect') || !permissions.has('Speak')) {
      return message.reply('❌ I do not have permission to connect and speak in your voice channel.');
    }

    if (!args.length) {
      return message.reply('❌ Please specify a song name or URL: `.play <song name / URL>`');
    }

    const query = args.join(' ').trim();
    const statusMsg = await message.channel.send(`🔍 Finding **${query}**...`);

    try {
      const { resource, title, trackUrl, duration, thumbnail } = await resolveAudio(query);

      await statusMsg.edit(`⏳ Loading **${title}**...`);

      // Clean up previous playback in this guild
      const previousSession = client.musicStore.get(message.guild.id);
      if (previousSession) {
        try { previousSession.player?.stop(); } catch {}
      }

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

      const player = createAudioPlayer();
      connection.subscribe(player);
      player.play(resource);

      client.musicStore.set(message.guild.id, {
        player,
        connection,
      });

      const embed = new EmbedBuilder()
        .setColor(0x5765f2)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${title}](${trackUrl})**`)
        .addFields({ name: 'Duration', value: duration, inline: true })
        .setThumbnail(thumbnail)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      await statusMsg.edit({ content: '', embeds: [embed] });

      const cleanup = () => {
        try { connection.destroy(); } catch {}
        client.musicStore.delete(message.guild.id);
      };

      player.on(AudioPlayerStatus.Idle, cleanup);
      player.on('error', err => {
        console.error('[player error]', err.message);
        cleanup();
        message.channel.send('❌ Playback encountered an error.').catch(() => {});
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          cleanup();
        }
      });

    } catch (err) {
      console.error('[PLAY ERROR]', err.message || err);
      statusMsg.edit(`❌ Playback failed: \`${err.message || 'Unknown error'}\``).catch(() => {});
    }
  },
};
