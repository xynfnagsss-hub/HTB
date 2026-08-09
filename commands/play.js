const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
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

function runYtDlpJson(ytdlp, args) {
  return new Promise((resolve, reject) => {
    let out = '', err = '';
    const proc = spawn(ytdlp, args);
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d.toString(); });
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`Extraction failed (${code}): ${err.slice(0, 300)}`));
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error('Failed to parse video metadata JSON'));
      }
    });
    proc.on('error', reject);
  });
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

module.exports = {
  name: 'play',
  description: 'Play music in your voice channel from YouTube or search queries',
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
    const isUrl = /^https?:\/\//i.test(query);

    const statusMsg = await message.channel.send(`🔍 Searching for **${query}**...`);

    const ffmpegPath = getFfmpeg();
    let ytdlpPath;
    try {
      ytdlpPath = await ensureYtDlp();
    } catch (e) {
      return statusMsg.edit(`❌ Error loading yt-dlp binary: \`${e.message}\``);
    }

    // Extractor args to bypass bot detection on datacenter IPs without requiring cookies
    const playerClientArgs = ['--extractor-args', 'youtube:player_client=tv_embedded,android_vr,android'];

    try {
      let videoUrl;
      let title = 'Unknown Track';
      let duration = '0:00';
      let thumbnail = null;

      if (isUrl) {
        // Direct URL info extraction
        const info = await runYtDlpJson(ytdlpPath, [
          '--dump-single-json',
          '--skip-download',
          '--no-warnings',
          ...playerClientArgs,
          query,
        ]);
        videoUrl = info.webpage_url || info.url || query;
        title = info.title || query;
        duration = formatDuration(info.duration || 0);
        thumbnail = info.thumbnail || (info.thumbnails && info.thumbnails[0]?.url) || null;
      } else {
        // Search query via ytsearch1
        const searchInfo = await runYtDlpJson(ytdlpPath, [
          '--dump-single-json',
          '--skip-download',
          '--flat-playlist',
          '--no-warnings',
          ...playerClientArgs,
          `ytsearch1:${query}`,
        ]);

        const entry = searchInfo.entries?.[0] || searchInfo;
        if (!entry || (!entry.id && !entry.url)) {
          return statusMsg.edit('❌ No search results found for that query.');
        }

        videoUrl = entry.url?.startsWith('http') ? entry.url : `https://www.youtube.com/watch?v=${entry.id || entry.url}`;
        title = entry.title || query;
        duration = formatDuration(entry.duration || 0);
        thumbnail = entry.thumbnails?.[0]?.url || entry.thumbnail || null;
      }

      if (!videoUrl) {
        return statusMsg.edit('❌ Unable to resolve video URL.');
      }

      await statusMsg.edit(`⏳ Loading **${title}**...`);

      // Clean up previous playback in this guild if active
      const previousSession = client.musicStore.get(message.guild.id);
      if (previousSession) {
        try { previousSession.player?.stop(); } catch {}
        try { previousSession.ytProc?.kill(); } catch {}
        try { previousSession.ffmpegProc?.kill(); } catch {}
      }

      // Spawn yt-dlp audio stream
      const ytProc = spawn(ytdlpPath, [
        '--no-warnings',
        ...playerClientArgs,
        '-f', 'ba/ba*/b/best',
        '-o', '-',
        videoUrl,
      ]);

      // Spawn ffmpeg to convert to 48kHz stereo 16-bit PCM for Discord
      const ffmpegProc = spawn(ffmpegPath, [
        '-i', 'pipe:0',
        '-ac', '2',
        '-ar', '48000',
        '-f', 's16le',
        '-loglevel', 'warning',
        'pipe:1',
      ]);

      ytProc.stdout.pipe(ffmpegProc.stdin);

      // Handle stream errors
      ffmpegProc.stdin.on('error', () => {});
      ytProc.stdout.on('error', () => {});

      let ytErr = '';
      let ffErr = '';
      ytProc.stderr.on('data', d => { ytErr += d.toString(); });
      ffmpegProc.stderr.on('data', d => { ffErr += d.toString(); });
      ytProc.on('error', err => console.error('[yt-dlp error]', err.message));
      ffmpegProc.on('error', err => console.error('[ffmpeg error]', err.message));

      // Wait for ffmpeg to output initial PCM audio data before connecting
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Audio stream timed out.\n${ytErr.slice(0, 200)}`));
        }, 25000);

        ffmpegProc.stdout.once('data', () => {
          clearTimeout(timeout);
          resolve();
        });

        ffmpegProc.on('close', code => {
          clearTimeout(timeout);
          if (code !== 0) reject(new Error(`ffmpeg exited with code ${code}: ${ffErr.slice(0, 200)}`));
        });

        ytProc.on('close', code => {
          if (code !== 0) {
            clearTimeout(timeout);
            reject(new Error(`yt-dlp exited with code ${code}: ${ytErr.slice(0, 200)}`));
          }
        });
      });

      const resource = createAudioResource(ffmpegProc.stdout, {
        inputType: StreamType.Raw,
      });

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
        ytProc,
        ffmpegProc,
      });

      const embed = new EmbedBuilder()
        .setColor(0x5765f2)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${title}](${videoUrl})**`)
        .addFields({ name: 'Duration', value: duration, inline: true })
        .setThumbnail(thumbnail)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      await statusMsg.edit({ content: '', embeds: [embed] });

      const cleanup = () => {
        try { connection.destroy(); } catch {}
        try { ytProc.kill(); } catch {}
        try { ffmpegProc.kill(); } catch {}
        client.musicStore.delete(message.guild.id);
      };

      player.on(AudioPlayerStatus.Idle, cleanup);
      player.on('error', err => {
        console.error('[player error]', err.message);
        cleanup();
        message.channel.send('❌ Playback encountered an unexpected error.').catch(() => {});
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
  getFfmpeg,
};
