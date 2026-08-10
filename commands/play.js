const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  entersState,
  StreamType,
  getVoiceConnection,
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ensureYtDlp } = require('../utils/ensureYtDlp');

function getFfmpeg() {
  const base = path.join(__dirname, '../node_modules/ffmpeg-static');
  const win = path.join(base, 'ffmpeg.exe');
  const linux = path.join(base, 'ffmpeg');
  return fs.existsSync(win) ? win : fs.existsSync(linux) ? linux : 'ffmpeg';
}

function cleanTitle(title) {
  if (!title) return 'Unknown Track';
  return title
    .replace(/\.(?:mp3|wav|m4a|ogg|opus|aac|flac)$/i, '')
    .replace(/_/g, ' ')
    .trim();
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

function sanitizeSearchQuery(query) {
  return query
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/["'|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function runYtDlpSearch(ytdlp, query, limit = 10) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlp, [
      '--dump-single-json',
      '--no-warnings',
      '--flat-playlist',
      `ytsearch${limit}:${query}`,
    ]);

    let out = '', err = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { err += d.toString(); });

    proc.on('close', code => {
      if (code === 0) {
        try {
          const j = JSON.parse(out);
          const entries = (j.entries || []).filter(e => e && e.title);
          resolve(entries);
        } catch {
          reject(new Error('Failed to parse search metadata'));
        }
      } else {
        reject(new Error(err || `Exit code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function resolveTrackInfo(ytdlp, query) {
  const isUrl = /^https?:\/\//i.test(query);

  if (isUrl) {
    return {
      title: query,
      trackUrl: query,
      duration: 'Live / Audio',
      thumbnail: null,
      streamTarget: query,
      isRandomArtist: false,
    };
  }

  const isExplicitArtist = /\b(artist|random|shuffle)\b/i.test(query);
  const cleanQ = query.replace(/\b(artist|random|shuffle)\b/gi, '').trim();
  const isShortArtistQuery = cleanQ.split(' ').length <= 2;

  const searchQuery = isExplicitArtist || isShortArtistQuery
    ? `${cleanQ} songs music`
    : cleanQ;

  const entries = await runYtDlpSearch(ytdlp, searchQuery, 12);
  if (!entries || entries.length === 0) {
    throw new Error(`No tracks found for: ${query}`);
  }

  let chosen;
  let isRandomArtist = false;

  if (entries.length > 1 && (isExplicitArtist || isShortArtistQuery)) {
    const randomIndex = Math.floor(Math.random() * Math.min(entries.length, 10));
    chosen = entries[randomIndex];
    isRandomArtist = true;
  } else {
    chosen = entries[0];
  }

  const rawTitle = cleanTitle(chosen.title);
  const trackUrl = chosen.url || (chosen.id ? `https://www.youtube.com/watch?v=${chosen.id}` : query);
  const duration = formatDuration(chosen.duration || 0);
  const thumbnail = (chosen.thumbnails && chosen.thumbnails[0]?.url) || chosen.thumbnail || null;

  const sanitized = sanitizeSearchQuery(rawTitle);
  const streamTarget = `scsearch1:${sanitized}`;

  return {
    title: rawTitle,
    trackUrl,
    duration,
    thumbnail,
    streamTarget,
    isRandomArtist,
    artistName: cleanQ,
  };
}

function createStreamPipeline(ytdlpPath, ffmpegPath, target) {
  const ytProc = spawn(ytdlpPath, [
    '--no-warnings',
    '--retries', '10',
    '-f', 'ba/ba*/b/best/bestaudio',
    '-o', '-',
    target,
  ]);

  const ffProc = spawn(ffmpegPath, [
    '-i', 'pipe:0',
    '-ac', '2',
    '-ar', '48000',
    '-f', 's16le',
    '-loglevel', 'error',
    'pipe:1',
  ]);

  ytProc.stdout.pipe(ffProc.stdin);
  ytProc.stdout.on('error', () => {});
  ffProc.stdin.on('error', () => {});
  ytProc.stderr.on('data', () => {});
  ffProc.stderr.on('data', () => {});

  const resource = createAudioResource(ffProc.stdout, {
    inputType: StreamType.Arbitrary,
  });

  return { ytProc, ffProc, resource };
}

async function getOrCreateVoiceConnection(voiceChannel) {
  let connection = getVoiceConnection(voiceChannel.guild.id);

  if (connection) {
    if (
      connection.joinConfig.channelId !== voiceChannel.id ||
      connection.state.status === VoiceConnectionStatus.Destroyed ||
      connection.state.status === VoiceConnectionStatus.Disconnected
    ) {
      try { connection.destroy(); } catch {}
      connection = null;
    }
  }

  if (!connection) {
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
  }

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch (readyErr) {
    try { connection.destroy(); } catch {}
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  }

  return connection;
}

module.exports = {
  name: 'play',
  description: 'Play music or a random song from an artist in your voice channel',
  usage: '.play <song title, artist, or URL>',

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
      return message.reply('❌ Please specify a song name, artist, or URL: `.play <song / artist / URL>`');
    }

    const query = args.join(' ').trim();
    const statusMsg = await message.channel.send(`🔍 Finding **${query}**...`);

    let ytdlpPath;
    try {
      ytdlpPath = await ensureYtDlp();
    } catch (e) {
      return statusMsg.edit(`❌ Error loading audio engine: \`${e.message}\``);
    }

    const ffmpegPath = getFfmpeg();

    try {
      const track = await resolveTrackInfo(ytdlpPath, query);
      await statusMsg.edit(`⏳ Loading **${track.title}**...`);

      // Clear previous playback session or idle timer on this guild
      const existingSession = client.musicStore.get(message.guild.id);
      if (existingSession) {
        if (existingSession.idleTimer) clearTimeout(existingSession.idleTimer);
        try { existingSession.player?.stop(); } catch {}
        try { existingSession.ytProc?.kill(); } catch {}
        try { existingSession.ffProc?.kill(); } catch {}
      }

      // Establish voice connection and wait until fully Ready
      const connection = await getOrCreateVoiceConnection(voiceChannel);

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });

      connection.subscribe(player);

      const { ytProc, ffProc, resource } = createStreamPipeline(
        ytdlpPath,
        ffmpegPath,
        track.streamTarget
      );

      const sessionObj = {
        player,
        connection,
        ytProc,
        ffProc,
        idleTimer: null,
      };
      client.musicStore.set(message.guild.id, sessionObj);

      player.on(AudioPlayerStatus.Idle, () => {
        if (sessionObj.idleTimer) clearTimeout(sessionObj.idleTimer);

        sessionObj.idleTimer = setTimeout(() => {
          try { connection.destroy(); } catch {}
          client.musicStore.delete(message.guild.id);
        }, 180_000); // 3-minute idle timer
      });

      player.on('error', err => {
        console.error('[player error]', err.message);
        message.channel.send('❌ Playback encountered an error.').catch(() => {});
      });

      // Start playing the audio resource immediately
      player.play(resource);

      const embed = new EmbedBuilder()
        .setColor(0x5765f2)
        .setTitle(track.isRandomArtist ? `🎲 Random Track: ${track.artistName}` : '🎵 Now Playing')
        .setDescription(`**[${track.title}](${track.trackUrl})**`)
        .addFields(
          { name: 'Duration', value: track.duration, inline: true },
        )
        .setThumbnail(track.thumbnail)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      await statusMsg.edit({ content: '', embeds: [embed] });

    } catch (err) {
      console.error('[PLAY ERROR]', err.message || err);
      statusMsg.edit(`❌ Playback failed: \`${err.message || 'Unknown error'}\``).catch(() => {});
    }
  },
  getFfmpeg,
};
