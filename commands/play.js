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
  const linux = path.join(base, 'ffmpeg');
  const win = path.join(base, 'ffmpeg.exe');
  return fs.existsSync(linux) ? linux : fs.existsSync(win) ? win : 'ffmpeg';
}

const COOKIES_FILE = path.join(__dirname, '../data/cookies.txt');

function runYtDlp(ytdlp, args) {
  return new Promise((resolve, reject) => {
    let out = '', err = '';
    const proc = spawn(ytdlp, args);
    proc.stdout.on('data', d => out += d);
    proc.stderr.on('data', d => { err += d.toString(); console.error('[yt-dlp]', d.toString().trim()); });
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`yt-dlp failed (${code}): ${err.slice(0, 400)}`));
      try { resolve(JSON.parse(out)); } catch { reject(new Error('Failed to parse yt-dlp output')); }
    });
    proc.on('error', reject);
  });
}

module.exports = {
  name: 'play',
  description: 'Play a song in your voice channel',
  usage: '.play <song name or URL>',

  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ Join a voice channel first.');

    const perms = voiceChannel.permissionsFor(message.client.user);
    if (!perms.has('Connect') || !perms.has('Speak'))
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
      return statusMsg.edit(`❌ Failed to get yt-dlp: \`${e.message}\``);
    }

    const baseArgs = [
      '--cookies', COOKIES_FILE,
      '--no-playlist',
      '--no-warnings',
    ];

    try {
      let videoUrl, title, duration, thumbnail;

      if (isUrl) {
        // Direct URL — get info
        const info = await runYtDlp(ytdlp, [
          '--dump-single-json',
          '--skip-download',
          '--no-warnings',
          '--extractor-args', 'youtube:player_client=ios',
          '--cookies', COOKIES_FILE,
          query,
        ]);
        videoUrl = info.webpage_url || info.url;
        title = info.title || 'Unknown';
        duration = formatDuration(info.duration || 0);
        thumbnail = info.thumbnail || null;
      } else {
        // Search — use ytsearch to get first result URL, then get its info
        const searchInfo = await runYtDlp(ytdlp, [
          '--dump-single-json',
          '--skip-download',
          '--flat-playlist',
          '--no-warnings',
          '--extractor-args', 'youtube:player_client=ios',
          '--cookies', COOKIES_FILE,
          `ytsearch1:${query}`,
        ]);

        // flat-playlist gives us entries with just id/url
        const entry = searchInfo.entries?.[0] || searchInfo;
        videoUrl = entry.url?.startsWith('http') ? entry.url : `https://www.youtube.com/watch?v=${entry.id || entry.url}`;
        title = entry.title || query;
        duration = formatDuration(entry.duration || 0);
        thumbnail = entry.thumbnail || null;
      }

      if (!videoUrl) return statusMsg.edit('❌ No results found.');
      await statusMsg.edit(`⏳ Loading **${title}**...`);

      // Stream via yt-dlp → ffmpeg → Discord
      // Use iOS client + cookies to bypass YouTube's bot detection
      const ytProc = spawn(ytdlp, [
        '--no-warnings',
        '--extractor-args', 'youtube:player_client=ios',
        '--cookies', COOKIES_FILE,
        '-o', '-',
        videoUrl,
      ]);

      const ffmpegProc = spawn(ffmpeg, [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', 'pipe:0',
        '-ac', '2',
        '-ar', '48000',
        '-f', 's16le',
        '-loglevel', 'warning',
        'pipe:1',
      ]);

      ytProc.stdout.pipe(ffmpegProc.stdin);

      // Catch pipe errors so they don't crash the bot
      ffmpegProc.stdin.on('error', () => {});
      ytProc.stdout.on('error', () => {});

      let ytErr = '';
      let ffErr = '';
      ytProc.stderr.on('data', d => { ytErr += d.toString(); console.error('[yt-dlp stream]', d.toString().trim()); });
      ffmpegProc.stderr.on('data', d => { ffErr += d.toString(); console.error('[ffmpeg]', d.toString().trim()); });
      ytProc.on('error', e => console.error('[yt-dlp error]', e.message));
      ffmpegProc.on('error', e => console.error('[ffmpeg error]', e.message));

      // Wait for ffmpeg to start producing data before connecting to VC
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Audio stream timed out — yt-dlp may have failed.\n' + ytErr.slice(0, 300))), 20000);
        ffmpegProc.stdout.once('data', () => { clearTimeout(timeout); resolve(); });
        ffmpegProc.on('close', (code) => {
          clearTimeout(timeout);
          if (code !== 0) reject(new Error(`ffmpeg exited ${code}: ${ffErr.slice(0, 300)}`));
        });
        ytProc.on('close', (code) => {
          if (code !== 0) { clearTimeout(timeout); reject(new Error(`yt-dlp stream exited ${code}: ${ytErr.slice(0, 300)}`)); }
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
        .setColor(0xff0000)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${title}](${videoUrl})**`)
        .addFields({ name: 'Duration', value: duration, inline: true })
        .setThumbnail(thumbnail)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      await statusMsg.edit({ content: '', embeds: [embed] });

      const cleanup = () => {
        connection.destroy();
        try { ytProc.kill(); } catch {}
        try { ffmpegProc.kill(); } catch {}
        client.musicStore.delete(message.guild.id);
      };

      player.on(AudioPlayerStatus.Idle, cleanup);
      player.on('error', err => {
        console.error('[player error]', err.message);
        cleanup();
        message.channel.send('❌ Playback error.').catch(() => {});
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch { cleanup(); }
      });

    } catch (err) {
      console.error('[PLAY ERROR]', err.message);
      statusMsg.edit(`❌ Something went wrong: \`${err.message}\``).catch(() => {});
    }
  },
};

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
