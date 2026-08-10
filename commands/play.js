const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
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

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const s = Math.floor(Number(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function runYtDlpSingleJson(ytdlp, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlp, [
      '--dump-single-json',
      '--no-warnings',
      ...args,
    ]);

    let out = '', err = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { err += d.toString(); });

    proc.on('close', code => {
      if (code === 0) {
        try {
          const j = JSON.parse(out);
          const entry = (j.entries && j.entries.length > 0) ? j.entries[0] : j;
          if (entry) resolve(entry);
          else reject(new Error('No entry found'));
        } catch {
          reject(new Error('Failed to parse metadata JSON'));
        }
      } else {
        reject(new Error(err || `Exit code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

async function extractYouTubeTrack(ytdlp, query) {
  const isUrl = /^https?:\/\//i.test(query);
  const target = isUrl ? query : `ytsearch1:${query}`;

  const clientConfigs = [
    'android,web,tv_embedded',
    'android',
    'tv_embedded,android',
    'web_embedded,mweb',
    'web',
  ];

  let lastErr = '';
  for (const clients of clientConfigs) {
    try {
      const entry = await runYtDlpSingleJson(ytdlp, [
        '--extractor-args', `youtube:player_client=${clients}`,
        '-f', 'ba/ba*/b/best/bestaudio',
        target,
      ]);

      const directUrl = entry.url || (entry.formats && entry.formats.reverse().find(f => f.url)?.url);
      if (directUrl) {
        return {
          title: entry.title || query,
          trackUrl: entry.webpage_url || (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : query),
          duration: formatDuration(entry.duration || 0),
          thumbnail: (entry.thumbnails && entry.thumbnails[0]?.url) || entry.thumbnail || null,
          directAudioUrl: directUrl,
        };
      }
    } catch (e) {
      lastErr = e.message;
    }
  }

  throw new Error(`YouTube extraction failed: ${lastErr.slice(0, 200)}`);
}

module.exports = {
  name: 'play',
  description: 'Play music in your voice channel from YouTube with boosted volume',
  usage: '.play <song title or YouTube URL>',

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
      return message.reply('❌ Please specify a song name or YouTube URL: `.play <song name / YouTube URL>`');
    }

    const query = args.join(' ').trim();
    const statusMsg = await message.channel.send(`🔍 Finding **${query}** on YouTube...`);

    let ytdlpPath;
    try {
      ytdlpPath = await ensureYtDlp();
    } catch (e) {
      return statusMsg.edit(`❌ Error loading yt-dlp: \`${e.message}\``);
    }

    const ffmpegPath = getFfmpeg();

    try {
      const track = await extractYouTubeTrack(ytdlpPath, query);

      await statusMsg.edit(`⏳ Loading **${track.title}**...`);

      // Clear previous playback session or idle timer on this guild
      const existingSession = client.musicStore.get(message.guild.id);
      if (existingSession) {
        if (existingSession.idleTimer) clearTimeout(existingSession.idleTimer);
        try { existingSession.player?.stop(); } catch {}
        try { existingSession.ffmpegProc?.kill(); } catch {}
      }

      // Stream native Ogg Opus audio with 160% volume pre-amplification
      const ffmpegProc = spawn(ffmpegPath, [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', track.directAudioUrl,
        '-filter:a', 'volume=1.6',
        '-c:a', 'libopus',
        '-b:a', '96k',
        '-ar', '48000',
        '-ac', '2',
        '-f', 'opus',
        '-loglevel', 'warning',
        'pipe:1',
      ]);

      ffmpegProc.on('error', err => console.error('[ffmpeg error]', err.message));

      const resource = createAudioResource(ffmpegProc.stdout, {
        inputType: StreamType.OggOpus,
      });

      let connection = getVoiceConnection(message.guild.id);
      if (!connection || connection.joinConfig.channelId !== voiceChannel.id) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
        });
      }

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

      const player = createAudioPlayer();
      connection.subscribe(player);

      const sessionObj = {
        player,
        connection,
        ffmpegProc,
        idleTimer: null,
      };
      client.musicStore.set(message.guild.id, sessionObj);

      // When the song ends, stop ffmpeg and start a 3-minute idle leave timer
      player.on(AudioPlayerStatus.Idle, () => {
        try { ffmpegProc.kill(); } catch {}
        if (sessionObj.idleTimer) clearTimeout(sessionObj.idleTimer);

        sessionObj.idleTimer = setTimeout(() => {
          try { connection.destroy(); } catch {}
          client.musicStore.delete(message.guild.id);
        }, 180_000); // Wait 3 minutes before leaving VC
      });

      player.on('error', err => {
        console.error('[player error]', err.message);
        try { ffmpegProc.kill(); } catch {}
        message.channel.send('❌ Playback encountered an error.').catch(() => {});
      });

      // Start playing the audio resource
      player.play(resource);

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('▶️ YouTube Playback')
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
