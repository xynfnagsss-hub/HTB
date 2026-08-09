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
const play = require('play-dl');
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

let scClientIdInit = false;
async function initSoundCloud() {
  if (!scClientIdInit) {
    try {
      const cid = await play.getFreeClientID();
      if (cid) {
        await play.setToken({ soundcloud: { client_id: cid } });
        scClientIdInit = true;
      }
    } catch (e) {
      console.warn('[SoundCloud Init]', e.message);
    }
  }
}

module.exports = {
  name: 'play',
  description: 'Play music in your voice channel from SoundCloud, YouTube, or Spotify',
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
    await initSoundCloud();

    let directAudioUrl;
    let title = query;
    let trackUrl = query;
    let duration = '0:00';
    let thumbnail = null;

    try {
      // 1. If it's a Spotify link, extract track info and search
      if (isUrl && play.is_expired()) {
        try { await play.refreshToken(); } catch {}
      }

      // Check if it's a SoundCloud URL or general search query
      let resolved = false;

      // Strategy A: If query is NOT a direct YouTube URL, search SoundCloud first (bypasses datacenter YouTube IP blocks 100%)
      if (!isUrl || query.includes('soundcloud.com')) {
        try {
          const scResults = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
          if (scResults && scResults.length > 0) {
            const track = scResults[0];
            const scStream = await play.stream(track.url);
            directAudioUrl = scStream.url;
            title = track.name || query;
            trackUrl = track.url;
            duration = formatDuration(track.durationInSec || (track.durationInMs ? track.durationInMs / 1000 : 0));
            thumbnail = track.thumbnail || null;
            resolved = true;
          }
        } catch (scErr) {
          console.warn('[SoundCloud search error]', scErr.message);
        }
      }

      // Strategy B: If not resolved yet (e.g. YouTube URL or direct link), try yt-dlp
      if (!resolved) {
        let ytdlpPath;
        try {
          ytdlpPath = await ensureYtDlp();
        } catch (e) {
          return statusMsg.edit(`❌ Error loading yt-dlp: \`${e.message}\``);
        }

        const playerClientArgs = ['--extractor-args', 'youtube:player_client=tv_embedded,android_vr,android'];

        try {
          const targetQuery = isUrl ? query : `scsearch1:${query}`;
          const info = await runYtDlpJson(ytdlpPath, [
            '--dump-single-json',
            '--no-warnings',
            ...playerClientArgs,
            '-f', 'ba/ba*/b/best',
            targetQuery,
          ]);

          const entry = (info.entries && info.entries[0]) ? info.entries[0] : info;
          if (entry && entry.url) {
            directAudioUrl = entry.url;
            videoUrl = entry.webpage_url || (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : query);
            title = entry.title || query;
            trackUrl = videoUrl;
            duration = formatDuration(entry.duration || 0);
            thumbnail = (entry.thumbnails && entry.thumbnails[0]?.url) || entry.thumbnail || null;
            resolved = true;
          }
        } catch (ytErr) {
          // If YouTube direct link failed with bot detection, fallback to searching the video title on SoundCloud
          if (isUrl) {
            try {
              const scResults = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
              if (scResults && scResults.length > 0) {
                const track = scResults[0];
                const scStream = await play.stream(track.url);
                directAudioUrl = scStream.url;
                title = track.name || query;
                trackUrl = track.url;
                duration = formatDuration(track.durationInSec || (track.durationInMs ? track.durationInMs / 1000 : 0));
                thumbnail = track.thumbnail || null;
                resolved = true;
              }
            } catch {}
          }

          if (!resolved) {
            return statusMsg.edit(`❌ Could not stream this track: \`${ytErr.message || 'Stream extraction failed'}\``);
          }
        }
      }

      if (!directAudioUrl) {
        return statusMsg.edit('❌ No playable audio stream could be found.');
      }

      await statusMsg.edit(`⏳ Loading **${title}**...`);

      // Clean up previous playback session on this guild
      const previousSession = client.musicStore.get(message.guild.id);
      if (previousSession) {
        try { previousSession.player?.stop(); } catch {}
        try { previousSession.ffmpegProc?.kill(); } catch {}
      }

      // Stream via ffmpeg with auto-reconnection
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
        .setDescription(`**[${title}](${trackUrl})**`)
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
