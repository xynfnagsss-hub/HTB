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

function runYtDlp(ytdlp, args) {
  return new Promise((resolve, reject) => {
    let out = '', err = '';
    const proc = spawn(ytdlp, args);
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => { err += d.toString(); });
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`yt-dlp exited with code ${code}: ${err.slice(0, 400)}`));
      try {
        resolve(JSON.parse(out));
      } catch {
        reject(new Error('Failed to parse yt-dlp response JSON'));
      }
    });
    proc.on('error', reject);
  });
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

module.exports = {
  name: 'play',
  description: 'Play a song in your voice channel',
  usage: '.play <song name or URL>',

  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ Join a voice channel first.');

    const perms = voiceChannel.permissionsFor(message.client.user);
    if (!perms || !perms.has('Connect') || !perms.has('Speak'))
      return message.reply('❌ I need Connect and Speak permissions in your VC.');

    if (!args.length) return message.reply('❌ Usage: `.play <song name or URL>`');

    const query = args.join(' ');
    const isUrl = /^https?:\/\//.test(query);

    const statusMsg = await message.channel.send(`🔍 Searching **${query}**...`);

    const ffmpeg = getFfmpeg();
    let ytdlp;
    try {
      ytdlp = await ensureYtDlp();
    } catch (e) {
      return statusMsg.edit(`❌ Failed to prepare yt-dlp: \`${e.message}\``);
    }

    try {
      let videoUrl, title, duration, thumbnail;

      if (isUrl) {
        // Direct URL
        const info = await runYtDlp(ytdlp, [
          '--dump-single-json',
          '--skip-download',
          '--no-warnings',
          '--js-runtimes', 'node',
          query,
        ]);
        videoUrl = info.webpage_url || info.url || query;
        title = info.title || 'Unknown Title';
        duration = formatDuration(info.duration || 0);
        thumbnail = info.thumbnail || (info.thumbnails && info.thumbnails[0]?.url) || null;
      } else {
        // Search query
        const searchInfo = await runYtDlp(ytdlp, [
          '--dump-single-json',
          '--skip-download',
          '--flat-playlist',
          '--no-warnings',
          '--js-runtimes', 'node',
          `ytsearch1:${query}`,
        ]);

        const entry = searchInfo.entries?.[0] || searchInfo;
        if (!entry || (!entry.id && !entry.url)) {
          return statusMsg.edit('❌ No results found for that query.');
        }

        videoUrl = entry.url?.startsWith('http') ? entry.url : `https://www.youtube.com/watch?v=${entry.id || entry.url}`;
        title = entry.title || query;
        duration = formatDuration(entry.duration || 0);
        thumbnail = entry.thumbnails?.[0]?.url || entry.thumbnail || null;
      }

      if (!videoUrl) return statusMsg.edit('❌ Could not resolve a playable URL.');
      await statusMsg.edit(`⏳ Loading **${title}**...`);

      // Clean up previous playback on this guild
      const existing = client.musicStore.get(message.guild.id);
      if (existing) {
        try { existing.player?.stop(); } catch {}
        try { existing.ytProc?.kill(); } catch {}
        try { existing.ffmpegProc?.kill(); } catch {}
      }

      // Stream via yt-dlp -> ffmpeg -> raw PCM -> Discord
      const ytProc = spawn(ytdlp, [
        '--no-warnings',
        '--js-runtimes', 'node',
        '-f', 'ba/ba*/b/best',
        '-o', '-',
        videoUrl,
      ]);

      const ffmpegProc = spawn(ffmpeg, [
        '-i', 'pipe:0',
        '-ac', '2',
        '-ar', '48000',
        '-f', 's16le',
        '-loglevel', 'warning',
        'pipe:1',
      ]);

      ytProc.stdout.pipe(ffmpegProc.stdin);

      // Prevent uncaught pipe errors from crashing
      ffmpegProc.stdin.on('error', () => {});
      ytProc.stdout.on('error', () => {});

      let ytErr = '';
      let ffErr = '';
      ytProc.stderr.on('data', d => { ytErr += d.toString(); });
      ffmpegProc.stderr.on('data', d => { ffErr += d.toString(); });
      ytProc.on('error', e => console.error('[yt-dlp stream error]', e.message));
      ffmpegProc.on('error', e => console.error('[ffmpeg stream error]', e.message));

      // Wait for ffmpeg to start producing raw PCM audio data
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Audio stream initialization timed out.')), 25000);
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

      const resource = createAudioResource(ffmpegProc.stdout, { inputType: StreamType.Raw });

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

      const player = createAudioPlayer();
      connection.subscribe(player);
      player.play(resource);

      client.musicStore.set(message.guild.id, { player, connection, ytProc, ffmpegProc });

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
      statusMsg.edit(`❌ Something went wrong: \`${err.message || 'Unknown error'}\``).catch(() => {});
    }
  },
  getFfmpeg,
};
