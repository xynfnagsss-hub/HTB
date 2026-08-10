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
const yts = require('yt-search');
const { ensureYtDlp } = require('../utils/ensureYtDlp');

function getFfmpeg() {
  const base = path.join(__dirname, '../node_modules/ffmpeg-static');
  const win = path.join(base, 'ffmpeg.exe');
  const linux = path.join(base, 'ffmpeg');
  return fs.existsSync(win) ? win : fs.existsSync(linux) ? linux : 'ffmpeg';
}

async function extractDirectUrl(ytdlp, target) {
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
      const url = await new Promise((resolve, reject) => {
        const proc = spawn(ytdlp, [
          '-g',
          '--no-warnings',
          '--extractor-args', `youtube:player_client=${clients}`,
          '-f', 'ba/ba*/b/best/bestaudio',
          target,
        ]);

        let out = '', err = '';
        proc.stdout.on('data', d => { out += d.toString(); });
        proc.stderr.on('data', d => { err += d.toString(); });

        proc.on('close', code => {
          const directUrl = out.trim().split('\n')[0];
          if (directUrl && code === 0) {
            resolve(directUrl);
          } else {
            reject(new Error(err || `Exit code ${code}`));
          }
        });

        proc.on('error', reject);
      });

      if (url) return url;
    } catch (e) {
      lastErr = e.message;
    }
  }

  throw new Error(`Stream extraction failed: ${lastErr.slice(0, 250)}`);
}

function extractYouTubeId(url) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

module.exports = {
  name: 'play',
  description: 'Play music in your voice channel from YouTube or search queries with boosted volume',
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

    const statusMsg = await message.channel.send(`🔍 Finding **${query}**...`);

    let ytdlpPath;
    try {
      ytdlpPath = await ensureYtDlp();
    } catch (e) {
      return statusMsg.edit(`❌ Error loading yt-dlp binary: \`${e.message}\``);
    }

    const ffmpegPath = getFfmpeg();

    let target = query;
    let title = query;
    let trackUrl = query;
    let duration = '0:00';
    let thumbnail = null;

    try {
      // 1. Resolve metadata
      if (isUrl) {
        const videoId = extractYouTubeId(query);
        if (videoId) {
          const ytMatch = await yts({ videoId }).catch(() => null);
          if (ytMatch) {
            title = ytMatch.title;
            trackUrl = ytMatch.url;
            duration = ytMatch.timestamp;
            thumbnail = ytMatch.thumbnail;
            target = ytMatch.url;
          }
        }
      } else {
        const searchRes = await yts(query).catch(() => null);
        if (searchRes && searchRes.videos && searchRes.videos.length > 0) {
          const bestVideo = searchRes.videos[0];
          title = bestVideo.title;
          trackUrl = bestVideo.url;
          duration = bestVideo.timestamp;
          thumbnail = bestVideo.thumbnail;
          target = bestVideo.url;
        } else {
          // If yt-search didn't return a video, let yt-dlp search directly
          target = `ytsearch1:${query}`;
        }
      }

      await statusMsg.edit(`⏳ Loading **${title}**...`);

      // 2. Extract direct audio stream URL with multi-client fallback
      let directAudioUrl;
      try {
        directAudioUrl = await extractDirectUrl(ytdlpPath, target);
      } catch (err) {
        if (!isUrl && target !== `ytsearch1:${query}`) {
          // Fallback to direct ytsearch
          directAudioUrl = await extractDirectUrl(ytdlpPath, `ytsearch1:${query}`);
        } else {
          throw err;
        }
      }

      if (!directAudioUrl) {
        return statusMsg.edit('❌ Could not extract a playable audio stream for this track.');
      }

      // 3. Clean up previous playback in this guild
      const previousSession = client.musicStore.get(message.guild.id);
      if (previousSession) {
        try { previousSession.player?.stop(); } catch {}
        try { previousSession.ffmpegProc?.kill(); } catch {}
      }

      // 4. Stream via ffmpeg with volume booster (volume=1.6 for significantly louder sound)
      const ffmpegProc = spawn(ffmpegPath, [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-i', directAudioUrl,
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
        inlineVolume: true,
      });

      if (resource.volume) {
        resource.volume.setVolume(1.2);
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
        ffmpegProc,
      });

      const embed = new EmbedBuilder()
        .setColor(0x5765f2)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${title}](${trackUrl})**`)
        .addFields(
          { name: 'Duration', value: duration || '0:00', inline: true },
          { name: 'Volume', value: '🔊 160% Boosted', inline: true },
        )
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
  getFfmpeg,
};
