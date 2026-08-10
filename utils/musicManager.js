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
const { spawn, exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ensureYtDlp } = require('./ensureYtDlp');

function getFfmpegPath() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore', timeout: 2000 });
    return 'ffmpeg';
  } catch {}

  const base = path.join(__dirname, '../node_modules/ffmpeg-static');
  const win = path.join(base, 'ffmpeg.exe');
  const linux = path.join(base, 'ffmpeg');
  if (process.platform === 'win32' && fs.existsSync(win)) return win;
  if (fs.existsSync(linux)) {
    try { fs.chmodSync(linux, '755'); } catch {}
    return linux;
  }
  return 'ffmpeg';
}

function cleanTitle(title) {
  if (!title) return 'Unknown Track';
  return title
    .replace(/\.(?:mp3|wav|m4a|ogg|opus|aac|flac)$/i, '')
    .replace(/_/g, ' ')
    .trim();
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return 'Live / Audio';
  const s = Math.floor(Number(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function killProcess(proc) {
  if (!proc) return;
  try {
    if (proc.stdin) proc.stdin.destroy();
    if (proc.stdout) proc.stdout.destroy();
    if (proc.stderr) proc.stderr.destroy();
    if (proc.pid) {
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
      } else {
        proc.kill('SIGKILL');
      }
    }
  } catch {}
}

function getDirectStreamUrl(ytdlpPath, targetUrl) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpPath, [
      '--no-warnings',
      '--get-url',
      '-f', 'ba/bestaudio/best',
      targetUrl,
    ]);

    let out = '', err = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { err += d.toString(); });

    proc.on('close', code => {
      const directUrl = out.trim().split('\n')[0];
      if (code === 0 && directUrl && directUrl.startsWith('http')) {
        resolve(directUrl);
      } else {
        reject(new Error(err.trim() || 'Failed to extract audio stream'));
      }
    });
  });
}

function buildYtDlpStreamArgs(target) {
  return [
    '--no-warnings',
    '--retries', '10',
    '--fragment-retries', '10',
    '-f', 'ba/bestaudio/best',
    '-o', '-',
    target,
  ];
}

class GuildQueue {
  constructor(guild, voiceChannel, textChannel, client) {
    this.guild = guild;
    this.guildId = guild.id;
    this.voiceChannel = voiceChannel;
    this.textChannel = textChannel;
    this.client = client;
    this.tracks = [];
    this.currentTrack = null;
    this.loopMode = 'off'; // 'off' | 'track' | 'queue'
    this.isPlaying = false;
    this.isPaused = false;
    this.idleTimer = null;
    this.connection = null;
    this.player = null;
    this.currentProcesses = null;
    this.currentResource = null;

    this.initPlayer();
  }

  initPlayer() {
    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    this.player.on(AudioPlayerStatus.Idle, (oldState) => {
      // Only advance track if player was actively playing
      if (this.isPlaying && oldState.status === AudioPlayerStatus.Playing) {
        this.cleanupProcesses();
        this.handleSongEnd();
      }
    });

    this.player.on('error', (error) => {
      console.error(`[AudioPlayer Error ${this.guildId}]:`, error.message);
      this.cleanupProcesses();
      if (this.textChannel) {
        this.textChannel.send('❌ Playback error encountered. Skipping to next track...').catch(() => {});
      }
      this.handleSongEnd();
    });
  }

  cleanupProcesses() {
    if (this.currentProcesses) {
      killProcess(this.currentProcesses.ytProc);
      killProcess(this.currentProcesses.ffProc);
      this.currentProcesses = null;
    }
    this.currentResource = null;
  }

  resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.idleTimer = setTimeout(() => {
      if (!this.isPlaying && this.tracks.length === 0) {
        this.destroy();
        if (this.textChannel) {
          this.textChannel.send('👋 Disconnected due to inactivity.').catch(() => {});
        }
      }
    }, 180_000); // 3 minutes
  }

  clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  async connect() {
    let connection = getVoiceConnection(this.guildId);
    if (
      connection &&
      (connection.joinConfig.channelId !== this.voiceChannel.id ||
        connection.state.status === VoiceConnectionStatus.Destroyed ||
        connection.state.status === VoiceConnectionStatus.Disconnected)
    ) {
      try { connection.destroy(); } catch {}
      connection = null;
    }

    if (!connection) {
      connection = joinVoiceChannel({
        channelId: this.voiceChannel.id,
        guildId: this.guildId,
        adapterCreator: this.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false,
      });
    }

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    } catch {
      try { connection.destroy(); } catch {}
      connection = joinVoiceChannel({
        channelId: this.voiceChannel.id,
        guildId: this.guildId,
        adapterCreator: this.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false,
      });
      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
    }

    this.connection = connection;
    connection.subscribe(this.player);
    return connection;
  }

  async playNext() {
    this.clearIdleTimer();

    if (this.tracks.length === 0 && !this.currentTrack) {
      this.isPlaying = false;
      this.isPaused = false;
      this.resetIdleTimer();
      return;
    }

    const nextTrack = this.tracks.shift();
    if (!nextTrack) {
      this.currentTrack = null;
      this.isPlaying = false;
      this.isPaused = false;
      this.resetIdleTimer();
      return;
    }

    this.currentTrack = nextTrack;
    this.isPlaying = true;
    this.isPaused = false;

    try {
      await this.connect();
      this.cleanupProcesses();

      const ytdlpPath = await ensureYtDlp();
      const ffmpegPath = getFfmpegPath();

      const target = nextTrack.url || nextTrack.streamUrl;
      const directAudioUrl = await getDirectStreamUrl(ytdlpPath, target).catch(() => null);

      let ffProc;
      let ytProc = null;

      if (directAudioUrl) {
        // High-speed direct HTTP streaming with auto-reconnection and buffering
        ffProc = spawn(ffmpegPath, [
          '-reconnect', '1',
          '-reconnect_streamed', '1',
          '-reconnect_delay_max', '5',
          '-i', directAudioUrl,
          '-f', 's16le',
          '-ar', '48000',
          '-ac', '2',
          '-loglevel', 'warning',
          'pipe:1',
        ]);
      } else {
        // Fallback pipe stream
        const ytArgs = buildYtDlpStreamArgs(target);
        ytProc = spawn(ytdlpPath, ytArgs);

        ffProc = spawn(ffmpegPath, [
          '-i', 'pipe:0',
          '-f', 's16le',
          '-ar', '48000',
          '-ac', '2',
          '-loglevel', 'warning',
          'pipe:1',
        ]);

        ytProc.stdout.pipe(ffProc.stdin);
        ytProc.stdout.on('error', () => {});
        ffProc.stdin.on('error', () => {});
      }

      ffProc.stderr.on('data', () => {});

      this.currentProcesses = { ytProc, ffProc };

      const resource = createAudioResource(ffProc.stdout, {
        inputType: StreamType.Raw,
        inlineVolume: true,
      });

      if (resource.volume) {
        resource.volume.setVolume(1.0);
      }

      this.currentResource = resource;
      this.player.play(resource);

      const embed = new EmbedBuilder()
        .setColor(0x5765f2)
        .setTitle(nextTrack.isRandomArtist ? `🎲 Random Artist Track: ${nextTrack.artistName}` : '🎵 Now Playing')
        .setDescription(`**[${nextTrack.title}](${nextTrack.url})**`)
        .addFields(
          { name: 'Duration', value: nextTrack.duration || 'Unknown', inline: true },
          { name: 'Queue Position', value: 'Now Playing', inline: true },
        )
        .setThumbnail(nextTrack.thumbnail)
        .setFooter({ text: `Requested by ${nextTrack.requestedBy?.tag || 'User'}` })
        .setTimestamp();

      if (this.textChannel) {
        this.textChannel.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (err) {
      console.error(`[PlayNext Error ${this.guildId}]:`, err);
      this.cleanupProcesses();
      if (this.textChannel) {
        this.textChannel.send(`❌ Failed to stream **${nextTrack.title}**: \`${err.message}\``).catch(() => {});
      }
      this.handleSongEnd();
    }
  }

  handleSongEnd() {
    if (this.loopMode === 'track' && this.currentTrack) {
      this.tracks.unshift(this.currentTrack);
    } else if (this.loopMode === 'queue' && this.currentTrack) {
      this.tracks.push(this.currentTrack);
    }

    this.currentTrack = null;
    this.playNext();
  }

  skip() {
    if (!this.isPlaying && !this.currentTrack) return false;
    const skippedTrack = this.currentTrack;
    this.cleanupProcesses();
    this.player.stop(true);
    return skippedTrack;
  }

  pause() {
    if (!this.isPlaying || this.isPaused) return false;
    const paused = this.player.pause();
    this.isPaused = paused;
    return paused;
  }

  resume() {
    if (!this.isPlaying || !this.isPaused) return false;
    const resumed = this.player.unpause();
    this.isPaused = !resumed;
    return resumed;
  }

  destroy() {
    this.clearIdleTimer();
    this.cleanupProcesses();
    this.tracks = [];
    this.currentTrack = null;
    this.isPlaying = false;
    this.isPaused = false;

    try {
      this.player.stop(true);
    } catch {}

    try {
      if (this.connection) {
        this.connection.destroy();
      }
    } catch {}

    if (this.client.musicStore) {
      this.client.musicStore.delete(this.guildId);
    }
  }
}

class MusicManager {
  constructor(client) {
    this.client = client;
    if (!client.musicStore) {
      client.musicStore = new Map();
    }
  }

  getQueue(guildId) {
    return this.client.musicStore.get(guildId) || null;
  }

  getOrCreateQueue(guild, voiceChannel, textChannel) {
    let queue = this.client.musicStore.get(guild.id);
    if (!queue) {
      queue = new GuildQueue(guild, voiceChannel, textChannel, this.client);
      this.client.musicStore.set(guild.id, queue);
    } else {
      queue.voiceChannel = voiceChannel;
      queue.textChannel = textChannel;
    }
    return queue;
  }

  async resolveSearch(query, requestedBy) {
    const ytdlpPath = await ensureYtDlp();
    const isUrl = /^https?:\/\//i.test(query);

    const extraArgs = [
      '--extractor-args', 'youtube:player_client=android_vr,android,ios,tv_embedded,mweb',
    ];

    if (isUrl) {
      return new Promise((resolve, reject) => {
        const proc = spawn(ytdlpPath, [
          '--dump-single-json',
          '--no-warnings',
          '--flat-playlist',
          ...extraArgs,
          query,
        ]);

        let out = '', err = '';
        proc.stdout.on('data', d => { out += d.toString(); });
        proc.stderr.on('data', d => { err += d.toString(); });

        proc.on('close', code => {
          if (code === 0) {
            try {
              const j = JSON.parse(out);
              if (j._type === 'playlist' && Array.isArray(j.entries)) {
                const tracks = j.entries.filter(e => e && e.title).map(e => ({
                  title: cleanTitle(e.title),
                  url: e.url || (e.id ? `https://www.youtube.com/watch?v=${e.id}` : query),
                  duration: formatDuration(e.duration),
                  thumbnail: (e.thumbnails && e.thumbnails[0]?.url) || e.thumbnail || null,
                  streamUrl: null,
                  requestedBy,
                  isRandomArtist: false,
                }));
                return resolve({ isPlaylist: true, tracks, playlistTitle: j.title || 'Playlist' });
              }

              const track = {
                title: cleanTitle(j.title || query),
                url: j.webpage_url || query,
                duration: formatDuration(j.duration),
                thumbnail: (j.thumbnails && j.thumbnails[0]?.url) || j.thumbnail || null,
                streamUrl: null,
                requestedBy,
                isRandomArtist: false,
              };
              resolve({ isPlaylist: false, tracks: [track] });
            } catch {
              resolve({
                isPlaylist: false,
                tracks: [{
                  title: query,
                  url: query,
                  duration: 'Live / Audio',
                  thumbnail: null,
                  streamUrl: null,
                  requestedBy,
                  isRandomArtist: false,
                }],
              });
            }
          } else {
            resolve({
              isPlaylist: false,
              tracks: [{
                title: query,
                url: query,
                duration: 'Live / Audio',
                thumbnail: null,
                streamUrl: null,
                requestedBy,
                isRandomArtist: false,
              }],
            });
          }
        });

        proc.on('error', reject);
      });
    }

    const isExplicitArtist = /\b(artist|random|shuffle)\b/i.test(query);
    const cleanQ = query.replace(/\b(artist|random|shuffle)\b/gi, '').trim();

    return new Promise((resolve, reject) => {
      const searchTarget = isExplicitArtist ? `ytsearch15:${cleanQ} official audio songs` : `ytsearch5:${cleanQ}`;

      const proc = spawn(ytdlpPath, [
        '--dump-single-json',
        '--no-warnings',
        '--flat-playlist',
        ...extraArgs,
        searchTarget,
      ]);

      let out = '', err = '';
      proc.stdout.on('data', d => { out += d.toString(); });
      proc.stderr.on('data', d => { err += d.toString(); });

      proc.on('close', code => {
        if (code === 0) {
          try {
            const j = JSON.parse(out);
            const entries = (j.entries || []).filter(e => e && e.title);
            if (!entries.length) {
              return reject(new Error(`No results found for "${query}"`));
            }

            let chosen;
            let isRandom = false;

            if (isExplicitArtist && entries.length > 1) {
              const idx = Math.floor(Math.random() * entries.length);
              chosen = entries[idx];
              isRandom = true;
            } else {
              chosen = entries[0];
            }

            const videoUrl = chosen.url || (chosen.id ? `https://www.youtube.com/watch?v=${chosen.id}` : `ytsearch1:${cleanQ}`);
            const track = {
              title: cleanTitle(chosen.title),
              url: videoUrl,
              duration: formatDuration(chosen.duration),
              thumbnail: (chosen.thumbnails && chosen.thumbnails[0]?.url) || chosen.thumbnail || null,
              streamUrl: null,
              requestedBy,
              isRandomArtist: isRandom,
              artistName: cleanQ,
            };

            resolve({ isPlaylist: false, tracks: [track] });
          } catch {
            reject(new Error('Failed to parse search metadata'));
          }
        } else {
          reject(new Error(err || `Search failed with exit code ${code}`));
        }
      });

      proc.on('error', reject);
    });
  }
}

module.exports = {
  MusicManager,
  GuildQueue,
  getFfmpegPath,
  formatDuration,
  cleanTitle,
};
