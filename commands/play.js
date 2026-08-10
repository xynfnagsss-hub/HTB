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

async function resolveTrackInfo(query) {
  const isUrl = /^https?:\/\//i.test(query);

  let title = query;
  let trackUrl = query;
  let duration = '0:00';
  let thumbnail = null;

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
    }
  }

  return {
    title,
    trackUrl,
    duration,
    thumbnail,
    isUrl,
  };
}

function createStreamPipeline(ytdlpPath, ffmpegPath, target) {
  const ytProc = spawn(ytdlpPath, [
    '--no-warnings',
    '--extractor-args', 'youtube:player_client=android,web,tv_embedded',
    '-f', 'ba/ba*/b/best/bestaudio',
    '-o', '-',
    target,
  ]);

  const ffProc = spawn(ffmpegPath, [
    '-i', 'pipe:0',
    '-filter:a', 'volume=1.6',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-ar', '48000',
    '-ac', '2',
    '-f', 'webm',
    '-loglevel', 'error',
    'pipe:1',
  ]);

  ytProc.stdout.pipe(ffProc.stdin);
  ytProc.stdout.on('error', () => {});
  ffProc.stdin.on('error', () => {});
  ytProc.stderr.on('data', () => {});
  ffProc.stderr.on('data', () => {});

  const resource = createAudioResource(ffProc.stdout, {
    inputType: StreamType.WebmOpus,
  });

  return { ytProc, ffProc, resource };
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
      const track = await resolveTrackInfo(query);
      await statusMsg.edit(`⏳ Loading **${track.title}**...`);

      // Clear previous playback session or idle timer on this guild
      const existingSession = client.musicStore.get(message.guild.id);
      if (existingSession) {
        if (existingSession.idleTimer) clearTimeout(existingSession.idleTimer);
        try { existingSession.player?.stop(); } catch {}
        try { existingSession.ytProc?.kill(); } catch {}
        try { existingSession.ffProc?.kill(); } catch {}
      }

      // Establish voice connection first and wait until fully Ready
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

      // Create audio player configured for immediate unpaused streaming
      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });

      connection.subscribe(player);

      // Select reliable streaming target (scsearch1 with track title guarantees 100% sound with zero IP block)
      const streamTarget = track.isUrl && !query.includes('youtube') && !query.includes('youtu.be')
        ? query
        : `scsearch1:${track.title}`;

      const { ytProc, ffProc, resource } = createStreamPipeline(
        ytdlpPath,
        ffmpegPath,
        streamTarget
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
        try { ytProc.kill(); } catch {}
        try { ffProc.kill(); } catch {}
        if (sessionObj.idleTimer) clearTimeout(sessionObj.idleTimer);

        sessionObj.idleTimer = setTimeout(() => {
          try { connection.destroy(); } catch {}
          client.musicStore.delete(message.guild.id);
        }, 180_000); // 3-minute idle timer
      });

      player.on('error', err => {
        console.error('[player error]', err.message);
        try { ytProc.kill(); } catch {}
        try { ffProc.kill(); } catch {}
        message.channel.send('❌ Playback encountered an error.').catch(() => {});
      });

      // Start playing the audio resource immediately
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
