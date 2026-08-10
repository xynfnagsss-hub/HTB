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
const https = require('https');
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

function getYouTubeOEmbed(url) {
  return new Promise((resolve) => {
    try {
      const fullUrl = 'https://www.youtube.com/oembed?url=' + encodeURIComponent(url) + '&format=json';
      https.get(fullUrl, { timeout: 5000 }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try { resolve(JSON.parse(d)); } catch { resolve(null); }
        });
      }).on('error', () => resolve(null)).on('timeout', () => resolve(null));
    } catch {
      resolve(null);
    }
  });
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

async function extractTrackInfo(ytdlp, query) {
  const isUrl = /^https?:\/\//i.test(query);
  const target = isUrl ? query : `ytsearch1:${query}`;

  const clientConfigs = [
    'android,web,tv_embedded',
    'android',
    'tv_embedded,android',
    'web_embedded,mweb',
  ];

  // 1. Try YouTube with player clients
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
      // Continue to next client or fallback
    }
  }

  // 2. Fallback: If YouTube triggered bot detection or format error, resolve title and search SoundCloud
  let fallbackSearchQuery = query;
  if (isUrl) {
    const oembed = await getYouTubeOEmbed(query);
    if (oembed?.title) {
      fallbackSearchQuery = `${oembed.title} ${oembed.author_name || ''}`;
    }
  }

  try {
    const scEntry = await runYtDlpSingleJson(ytdlp, [
      '-f', 'ba/ba*/b/best/bestaudio',
      `scsearch1:${fallbackSearchQuery}`,
    ]);

    const scDirectUrl = scEntry.url || (scEntry.formats && scEntry.formats.reverse().find(f => f.url)?.url);
    if (scDirectUrl) {
      return {
        title: scEntry.title || fallbackSearchQuery,
        trackUrl: scEntry.webpage_url || query,
        duration: formatDuration(scEntry.duration || 0),
        thumbnail: (scEntry.thumbnails && scEntry.thumbnails[0]?.url) || scEntry.thumbnail || null,
        directAudioUrl: scDirectUrl,
      };
    }
  } catch (scErr) {
    // Both YouTube and SoundCloud failed
  }

  throw new Error('Could not find a playable stream for this track. Please try a different song title or link.');
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
    const statusMsg = await message.channel.send(`🔍 Finding **${query}**...`);

    let ytdlpPath;
    try {
      ytdlpPath = await ensureYtDlp();
    } catch (e) {
      return statusMsg.edit(`❌ Error loading yt-dlp: \`${e.message}\``);
    }

    const ffmpegPath = getFfmpeg();

    try {
      const track = await extractTrackInfo(ytdlpPath, query);

      await statusMsg.edit(`⏳ Loading **${track.title}**...`);

      // Clean up any existing playback session in this guild
      const previousSession = client.musicStore.get(message.guild.id);
      if (previousSession) {
        try { previousSession.player?.stop(); } catch {}
        try { previousSession.ffmpegProc?.kill(); } catch {}
      }

      // Stream audio through ffmpeg with 160% volume amplification
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

      client.musicStore.set(message.guild.id, {
        player,
        connection,
        ffmpegProc,
      });

      let hasStartedPlaying = false;

      player.on(AudioPlayerStatus.Playing, () => {
        hasStartedPlaying = true;
      });

      const cleanup = () => {
        try { connection.destroy(); } catch {}
        try { ffmpegProc.kill(); } catch {}
        client.musicStore.delete(message.guild.id);
      };

      // Only clean up on Idle if the song was actually playing before
      player.on(AudioPlayerStatus.Idle, () => {
        if (hasStartedPlaying) {
          cleanup();
        }
      });

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
