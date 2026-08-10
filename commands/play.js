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
const yts = require('yt-search');
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

function getDirectStreamUrl(ytdlp, target, clientConfigs = ['android,web,tv_embedded', 'android', 'web_embedded']) {
  return new Promise((resolve, reject) => {
    const isSc = target.startsWith('scsearch1:');
    const args = isSc
      ? ['-g', '--no-warnings', '-f', 'ba/ba*/b/best/bestaudio', target]
      : ['-g', '--no-warnings', '--extractor-args', `youtube:player_client=${clientConfigs[0]}`, '-f', 'ba/ba*/b/best/bestaudio', target];

    const proc = spawn(ytdlp, args);
    let out = '', err = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { err += d.toString(); });

    proc.on('close', code => {
      const url = out.trim().split('\n')[0];
      if (code === 0 && url && url.startsWith('http')) {
        resolve(url);
      } else {
        reject(new Error(err.trim() || `Exit code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function resolveTrack(ytdlp, query) {
  const isUrl = /^https?:\/\//i.test(query);

  let title = query;
  let trackUrl = query;
  let duration = '0:00';
  let thumbnail = null;
  let searchTitle = query;

  if (isUrl) {
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
      const vidMatch = query.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
      if (vidMatch && vidMatch[1]) {
        const info = await yts({ videoId: vidMatch[1] }).catch(() => null);
        if (info) {
          title = cleanTitle(info.title);
          trackUrl = info.url;
          duration = info.timestamp || '0:00';
          thumbnail = info.thumbnail;
          searchTitle = info.title;
        }
      }
    }
  } else {
    const r = await yts(query);
    if (r.videos && r.videos.length > 0) {
      const v = r.videos[0];
      title = cleanTitle(v.title);
      trackUrl = v.url;
      duration = v.timestamp || '0:00';
      thumbnail = v.thumbnail;
      searchTitle = v.title;
    }
  }

  // 1. Try YouTube stream extraction
  let directAudioUrl = null;
  try {
    directAudioUrl = await getDirectStreamUrl(ytdlp, isUrl ? query : trackUrl);
  } catch (ytErr) {
    // 2. YouTube blocked by datacenter IP bot-detection -> stream track audio via SoundCloud
    try {
      directAudioUrl = await getDirectStreamUrl(ytdlp, `scsearch1:${searchTitle}`);
    } catch (scErr) {
      throw new Error('Could not find a playable stream for this track. Please try a different song.');
    }
  }

  if (!directAudioUrl) {
    throw new Error('Could not extract direct stream URL.');
  }

  return {
    title,
    trackUrl,
    duration,
    thumbnail,
    directAudioUrl,
  };
}

module.exports = {
  name: 'play',
  description: 'Play music in your voice channel with boosted volume',
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

    let ytdlpPath;
    try {
      ytdlpPath = await ensureYtDlp();
    } catch (e) {
      return statusMsg.edit(`❌ Error loading audio engine: \`${e.message}\``);
    }

    const ffmpegPath = getFfmpeg();

    try {
      const track = await resolveTrack(ytdlpPath, query);

      await statusMsg.edit(`⏳ Loading **${track.title}**...`);

      // Clear previous playback session or idle timer on this guild
      const existingSession = client.musicStore.get(message.guild.id);
      if (existingSession) {
        if (existingSession.idleTimer) clearTimeout(existingSession.idleTimer);
        try { existingSession.player?.stop(); } catch {}
        try { existingSession.ffmpegProc?.kill(); } catch {}
      }

      // Stream high-fidelity raw PCM audio with 160% volume amplification
      const ffmpegProc = spawn(ffmpegPath, [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', track.directAudioUrl,
        '-filter:a', 'volume=1.6',
        '-ac', '2',
        '-ar', '48000',
        '-f', 's16le',
        '-loglevel', 'warning',
        'pipe:1',
      ]);

      ffmpegProc.on('error', err => console.error('[ffmpeg error]', err.message));

      const resource = createAudioResource(ffmpegProc.stdout, {
        inputType: StreamType.Raw,
      });

      let connection = getVoiceConnection(message.guild.id);
      if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed || connection.joinConfig.channelId !== voiceChannel.id) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
          selfDeaf: true,
        });
      }

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });

      connection.subscribe(player);

      const sessionObj = {
        player,
        connection,
        ffmpegProc,
        idleTimer: null,
      };
      client.musicStore.set(message.guild.id, sessionObj);

      player.on(AudioPlayerStatus.Idle, () => {
        try { ffmpegProc.kill(); } catch {}
        if (sessionObj.idleTimer) clearTimeout(sessionObj.idleTimer);

        sessionObj.idleTimer = setTimeout(() => {
          try { connection.destroy(); } catch {}
          client.musicStore.delete(message.guild.id);
        }, 180_000); // 3-minute idle timer
      });

      player.on('error', err => {
        console.error('[player error]', err.message);
        try { ffmpegProc.kill(); } catch {}
        message.channel.send('❌ Playback encountered an error.').catch(() => {});
      });

      // Start playing the audio resource
      player.play(resource);

      const embed = new EmbedBuilder()
        .setColor(0x5765f2)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${track.title}](${track.trackUrl})**`)
        .addFields(
          { name: 'Duration', value: track.duration, inline: true },
          { name: 'Volume', value: '🔊 160% Boosted', inline: true },
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
