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

    const playerClientArgs = ['--extractor-args', 'youtube:player_client=tv_embedded,android_vr,android'];

    try {
      let videoUrl;
      let directAudioUrl;
      let title = 'Unknown Track';
      let duration = '0:00';
      let thumbnail = null;

      // Direct URL vs search query target
      const targetQuery = isUrl ? query : `ytsearch1:${query}`;

      const info = await runYtDlpJson(ytdlpPath, [
        '--dump-single-json',
        '--no-warnings',
        ...playerClientArgs,
        '-f', 'ba/ba*/b/best',
        targetQuery,
      ]);

      const entry = (info.entries && info.entries[0]) ? info.entries[0] : info;
      if (!entry) {
        return statusMsg.edit('❌ No results found for that track.');
      }

      directAudioUrl = entry.url;
      videoUrl = entry.webpage_url || (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : query);
      title = entry.title || query;
      duration = formatDuration(entry.duration || 0);
      thumbnail = (entry.thumbnails && entry.thumbnails[0]?.url) || entry.thumbnail || null;

      if (!directAudioUrl) {
        return statusMsg.edit('❌ Unable to extract direct audio stream for this track.');
      }

      await statusMsg.edit(`⏳ Loading **${title}**...`);

      // Clean up previous playback session in this guild
      const previousSession = client.musicStore.get(message.guild.id);
      if (previousSession) {
        try { previousSession.player?.stop(); } catch {}
        try { previousSession.ffmpegProc?.kill(); } catch {}
      }

      // Stream directly from HTTPS audio URL using ffmpeg with auto-reconnect
      const ffmpegProc = spawn(ffmpegPath, [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', directAudioUrl,
        '-ac', '2',
        '-ar', '48000',
        '-f', 's16le',
        '-loglevel', 'warning',
        'pipe:1',
      ]);

      let ffErr = '';
      ffmpegProc.stderr.on('data', d => { ffErr += d.toString(); });
      ffmpegProc.on('error', err => console.error('[ffmpeg error]', err.message));

      // Wait for ffmpeg to start outputting PCM audio data
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Audio stream timed out.\n${ffErr.slice(0, 200)}`));
        }, 20000);

        ffmpegProc.stdout.once('data', () => {
          clearTimeout(timeout);
          resolve();
        });

        ffmpegProc.on('close', code => {
          clearTimeout(timeout);
          if (code !== 0) reject(new Error(`ffmpeg exited with code ${code}: ${ffErr.slice(0, 200)}`));
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
