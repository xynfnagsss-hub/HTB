const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  entersState,
  getVoiceConnection,
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const play = require('play-dl');

function cleanTitle(title) {
  if (!title) return 'Unknown Track';
  return title
    .replace(/\.(?:mp3|wav|m4a|ogg|opus|aac|flac)$/i, '')
    .replace(/_/g, ' ')
    .trim();
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

let scInit = false;
async function initSoundCloud() {
  if (!scInit) {
    try {
      const cid = await play.getFreeClientID().catch(() => null);
      if (cid) {
        await play.setToken({ soundcloud: { client_id: cid } });
        scInit = true;
      }
    } catch {}
  }
}

module.exports = {
  name: 'play',
  description: 'Play music in your voice channel',
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
    await initSoundCloud();

    try {
      let streamInfo;
      let title = query;
      let trackUrl = query;
      let duration = '0:00';
      let thumbnail = null;

      // 1. Direct URLs
      if (isUrl) {
        if (query.includes('spotify.com')) {
          if (play.is_expired()) await play.refreshToken().catch(() => {});
          const sp = await play.spotify(query);
          const scRes = await play.search(`${sp.name} ${sp.artists?.[0]?.name || ''}`, { source: { soundcloud: 'tracks' }, limit: 1 }).catch(() => null);
          if (scRes && scRes.length > 0) {
            streamInfo = await play.stream(scRes[0].url);
          } else {
            const ytRes = await play.search(`${sp.name} ${sp.artists?.[0]?.name || ''}`, { limit: 1 });
            if (ytRes && ytRes.length > 0) streamInfo = await play.stream(ytRes[0].url);
          }
          title = `${sp.name} - ${sp.artists?.map(a => a.name).join(', ') || ''}`;
          duration = formatDuration(sp.durationInSec);
          thumbnail = sp.thumbnail?.url || null;
          trackUrl = query;
        } else if (query.includes('soundcloud.com')) {
          const sc = await play.soundcloud(query).catch(() => null);
          streamInfo = await play.stream(query);
          title = cleanTitle(sc?.name || query);
          duration = formatDuration(sc?.durationInSec || 0);
          thumbnail = sc?.thumbnail || null;
          trackUrl = query;
        } else {
          // YouTube URL
          try {
            streamInfo = await play.stream(query);
            const info = await play.video_basic_info(query).catch(() => null);
            if (info?.video_details) {
              title = cleanTitle(info.video_details.title);
              duration = formatDuration(info.video_details.durationInSec);
              thumbnail = info.video_details.thumbnails?.[0]?.url || null;
              trackUrl = query;
            }
          } catch (ytErr) {
            // YouTube blocked on datacenter IP -> fallback to search
            const scRes = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 }).catch(() => null);
            if (scRes && scRes.length > 0) {
              streamInfo = await play.stream(scRes[0].url);
              title = cleanTitle(scRes[0].name);
              duration = formatDuration(scRes[0].durationInSec);
              thumbnail = scRes[0].thumbnail || null;
              trackUrl = scRes[0].url;
            }
          }
        }
      }
      // 2. Search Queries (e.g. ".play 4 big guys", ".play cocomelon", ".play step on shit")
      else {
        // Try YouTube search first
        let found = false;
        try {
          const ytResults = await play.search(query, { limit: 1 });
          if (ytResults && ytResults.length > 0) {
            const ytTrack = ytResults[0];
            streamInfo = await play.stream(ytTrack.url);
            title = cleanTitle(ytTrack.title || ytTrack.name);
            duration = formatDuration(ytTrack.durationInSec || 0);
            thumbnail = ytTrack.thumbnails?.[0]?.url || null;
            trackUrl = ytTrack.url;
            found = true;
          }
        } catch (e) {}

        // If YouTube stream blocked on datacenter IP, try SoundCloud
        if (!found) {
          try {
            const scResults = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
            if (scResults && scResults.length > 0) {
              const scTrack = scResults[0];
              streamInfo = await play.stream(scTrack.url);
              title = cleanTitle(scTrack.name || query);
              duration = formatDuration(scTrack.durationInSec || 0);
              thumbnail = scTrack.thumbnail || null;
              trackUrl = scTrack.url;
              found = true;
            }
          } catch (e) {}
        }
      }

      if (!streamInfo) {
        return statusMsg.edit('❌ Could not extract a playable audio stream for this track.');
      }

      await statusMsg.edit(`⏳ Loading **${title}**...`);

      // Clear any previous playback on this guild
      const existing = client.musicStore.get(message.guild.id);
      if (existing) {
        if (existing.idleTimer) clearTimeout(existing.idleTimer);
        try { existing.player?.stop(); } catch {}
      }

      const resource = createAudioResource(streamInfo.stream, {
        inputType: streamInfo.type,
      });

      let connection = getVoiceConnection(message.guild.id);
      if (!connection || connection.state.status === VoiceConnectionStatus.Destroyed || connection.joinConfig.channelId !== voiceChannel.id) {
        connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: message.guild.id,
          adapterCreator: message.guild.voiceAdapterCreator,
          selfDeaf: true,
        });
      }

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });

      connection.subscribe(player);

      const sessionObj = {
        player,
        connection,
        idleTimer: null,
      };
      client.musicStore.set(message.guild.id, sessionObj);

      player.on(AudioPlayerStatus.Idle, () => {
        if (sessionObj.idleTimer) clearTimeout(sessionObj.idleTimer);
        sessionObj.idleTimer = setTimeout(() => {
          try { connection.destroy(); } catch {}
          client.musicStore.delete(message.guild.id);
        }, 180_000); // 3-minute idle timer
      });

      player.on('error', err => {
        console.error('[player error]', err.message);
        message.channel.send('❌ Playback encountered an error.').catch(() => {});
      });

      player.play(resource);

      const embed = new EmbedBuilder()
        .setColor(0x5765f2)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${title}](${trackUrl})**`)
        .addFields({ name: 'Duration', value: duration, inline: true })
        .setThumbnail(thumbnail)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      await statusMsg.edit({ content: '', embeds: [embed] });

    } catch (err) {
      console.error('[PLAY ERROR]', err.message || err);
      statusMsg.edit(`❌ Playback failed: \`${err.message || 'Unknown error'}\``).catch(() => {});
    }
  },
};
