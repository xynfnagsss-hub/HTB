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

// Resolve ffmpeg from ffmpeg-static
function getFfmpeg() {
  const base = path.join(__dirname, '../node_modules/ffmpeg-static');
  const linux = path.join(base, 'ffmpeg');
  const win = path.join(base, 'ffmpeg.exe');
  return fs.existsSync(linux) ? linux : fs.existsSync(win) ? win : 'ffmpeg';
}

// Resolve binaries — use bundled ones so Railway always has them
function getBinaries() {
  const base = path.join(__dirname, '../node_modules');

  // ffmpeg — use bundled ffmpeg-static
  const ffmpegWin = path.join(base, 'ffmpeg-static/ffmpeg.exe');
  const ffmpegLinux = path.join(base, 'ffmpeg-static/ffmpeg');
  const ffmpeg = fs.existsSync(ffmpegLinux) ? ffmpegLinux
    : fs.existsSync(ffmpegWin) ? ffmpegWin
    : 'ffmpeg';

  // yt-dlp — always use system binary (installed via nixpacks on Railway)
  // The bundled @distube/yt-dlp binary is a Python script and needs Python in PATH
  const ytdlp = 'yt-dlp';

  return { ffmpeg, ytdlp };
}

const COOKIES_FILE = path.join(__dirname, '../data/cookies.txt');

const YTDLP_ARGS = [
  '--cookies', COOKIES_FILE,
  '--no-playlist',
  '--no-warnings',
  '--extractor-retries', '3',
];

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
    const input = isUrl ? query : `ytsearch1:${query}`;

    const statusMsg = await message.channel.send(`🔍 Searching **${query}**...`);

    const ffmpeg = getFfmpeg();

    let ytdlp;
    try {
      ytdlp = await ensureYtDlp();
    } catch (e) {
      return statusMsg.edit(`❌ Failed to get yt-dlp: \`${e.message}\``);
    }

    console.log('[play] ffmpeg:', ffmpeg);
    console.log('[play] ytdlp:', ytdlp);
    console.log('[play] input:', input);

    try {
      // Step 1: Get video info as JSON
      const info = await new Promise((resolve, reject) => {
        let out = '', err = '';
        const proc = spawn(ytdlp, [
          '--dump-single-json',
          ...YTDLP_ARGS,
          input,
        ]);
        proc.stdout.on('data', d => out += d);
        proc.stderr.on('data', d => { err += d; console.error('[yt-dlp info]', d.toString().trim()); });
        proc.on('close', code => {
          if (code !== 0) return reject(new Error(`yt-dlp info failed (${code}): ${err.slice(0, 300)}`));
          try { resolve(JSON.parse(out)); } catch (e) { reject(new Error('Failed to parse yt-dlp JSON')); }
        });
        proc.on('error', reject);
      });

      // Handle search results (entries array) vs direct video
      const video = info.entries ? info.entries[0] : info;
      if (!video) return statusMsg.edit('❌ No results found.');

      const videoUrl = video.webpage_url || video.url;
      const title = video.title || 'Unknown';
      const duration = formatDuration(video.duration || 0);
      const thumbnail = video.thumbnail || null;

      await statusMsg.edit(`⏳ Loading **${title}**...`);

      // Step 2: Stream audio via yt-dlp piped through ffmpeg -> Discord
      const ytProc = spawn(ytdlp, [
        '-o', '-',
        ...YTDLP_ARGS,
        videoUrl,
      ]);

      const ffmpegProc = spawn(ffmpeg, [
        '-i', 'pipe:0',
        '-ac', '2',
        '-ar', '48000',
        '-f', 's16le',
        '-loglevel', 'error',
        'pipe:1',
      ]);

      ytProc.stdout.pipe(ffmpegProc.stdin);
      ytProc.stderr.on('data', d => console.error('[yt-dlp stream]', d.toString().trim()));
      ffmpegProc.stderr.on('data', d => console.error('[ffmpeg]', d.toString().trim()));
      ytProc.on('error', e => console.error('[yt-dlp error]', e.message));
      ffmpegProc.on('error', e => console.error('[ffmpeg error]', e.message));

      const resource = createAudioResource(ffmpegProc.stdout, { inputType: StreamType.Raw });

      // Step 3: Join VC
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

      // Step 4: Now playing embed
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${title}](${videoUrl})**`)
        .addFields({ name: 'Duration', value: duration, inline: true })
        .setThumbnail(thumbnail)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      await statusMsg.edit({ content: '', embeds: [embed] });

      // Cleanup on finish
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
