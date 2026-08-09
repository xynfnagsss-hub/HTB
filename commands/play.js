const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');
const play = require('play-dl');

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const s = Math.floor(Number(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

let scReady = false;
async function ensureSoundCloud() {
  if (!scReady) {
    try {
      const cid = await play.getFreeClientID();
      if (cid) {
        await play.setToken({ soundcloud: { client_id: cid } });
        scReady = true;
      }
    } catch (e) {
      console.warn('[SoundCloud ClientID]', e.message);
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
    await ensureSoundCloud();

    try {
      let streamInfo;
      let title = query;
      let trackUrl = query;
      let duration = '0:00';
      let thumbnail = null;

      if (isUrl) {
        if (query.includes('spotify.com')) {
          const sp = await play.spotify(query);
          const scRes = await play.search(`${sp.name} ${sp.artists?.[0]?.name || ''}`, { source: { soundcloud: 'tracks' }, limit: 1 });
          if (!scRes || !scRes.length) throw new Error('Could not find a playable stream for this Spotify track.');
          streamInfo = await play.stream(scRes[0].url);
          title = `${sp.name} - ${sp.artists?.map(a => a.name).join(', ')}`;
          trackUrl = query;
          duration = formatDuration(sp.durationInSec);
          thumbnail = sp.thumbnail?.url || null;
        } else if (query.includes('soundcloud.com')) {
          const sc = await play.soundcloud(query);
          streamInfo = await play.stream(query);
          title = sc.name || query;
          trackUrl = query;
          duration = formatDuration(sc.durationInSec);
          thumbnail = sc.thumbnail || null;
        } else {
          // YouTube / generic URL
          try {
            streamInfo = await play.stream(query);
            const ytInfo = await play.video_basic_info(query).catch(() => null);
            if (ytInfo?.video_details) {
              title = ytInfo.video_details.title;
              duration = formatDuration(ytInfo.video_details.durationInSec);
              thumbnail = ytInfo.video_details.thumbnails?.[0]?.url || null;
            }
          } catch (ytErr) {
            // YouTube blocked on datacenter IP -> search SoundCloud
            const scRes = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
            if (!scRes || !scRes.length) throw new Error('Could not stream this track.');
            streamInfo = await play.stream(scRes[0].url);
            title = scRes[0].name;
            trackUrl = scRes[0].url;
            duration = formatDuration(scRes[0].durationInSec);
            thumbnail = scRes[0].thumbnail || null;
          }
        }
      } else {
        // Query search via SoundCloud (instant & immune to YouTube datacenter IP blocks)
        const scRes = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
        if (!scRes || !scRes.length) {
          return statusMsg.edit('❌ No results found for that track.');
        }

        streamInfo = await play.stream(scRes[0].url);
        title = scRes[0].name || query;
        trackUrl = scRes[0].url;
        duration = formatDuration(scRes[0].durationInSec);
        thumbnail = scRes[0].thumbnail || null;
      }

      if (!streamInfo) {
        return statusMsg.edit('❌ Failed to extract audio stream for this track.');
      }

      await statusMsg.edit(`⏳ Loading **${title}**...`);

      // Clean up previous playback session in this guild
      const previousSession = client.musicStore.get(message.guild.id);
      if (previousSession) {
        try { previousSession.player?.stop(); } catch {}
      }

      const resource = createAudioResource(streamInfo.stream, {
        inputType: streamInfo.type,
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
};
