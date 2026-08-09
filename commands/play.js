const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');
const playdl = require('play-dl');
const { EmbedBuilder } = require('discord.js');

// Set YouTube cookies once on load so play-dl bypasses bot detection
playdl.setToken({
  youtube: {
    cookie: [
      'HSID=AUolAcz8zuPf-xvQ1',
      'SSID=AH1T_BTRbgNBGEQq-',
      'APISID=NzQ-RC2HeBedA3gY/AHQBw8ewNjHdphGeY',
      'SAPISID=sBWBF6e56Kp83vUo/AufRiJF3yXRsryCR7',
      '__Secure-1PAPISID=sBWBF6e56Kp83vUo/AufRiJF3yXRsryCR7',
      '__Secure-3PAPISID=sBWBF6e56Kp83vUo/AufRiJF3yXRsryCR7',
      'SID=g.a000BQnkHqZ-CNI5YymIojqN92SA7Z7jCTIFLzXKiEgwQSo-b5LuayV25PwsaNSXP3QeXk2SQwACgYKAQ0SARYSFQHGX2Midj2G3YqqA3Lv0ByAvfunuBoVAUF8yKqMuthW8dxc-hwQahpJQEIy0076',
      '__Secure-1PSID=g.a000BQnkHqZ-CNI5YymIojqN92SA7Z7jCTIFLzXKiEgwQSo-b5Lu7ryTV8p99kOeTdLd-4V8PAACgYKAdISARYSFQHGX2MigK4iuAyBPkh93LFGkCmOIhoVAUF8yKp19iblY_TrjbRPNlrx1s2H0076',
      '__Secure-3PSID=g.a000BQnkHqZ-CNI5YymIojqN92SA7Z7jCTIFLzXKiEgwQSo-b5LuGRDT5sNqA9OLyDwNmu9s7gACgYKAS0SARYSFQHGX2MiGQlu24jl_ApvNZAjc8_apBoVAUF8yKpiSINtLpzpyovr_su2c6BF0076',
      'LOGIN_INFO=AFmmF2swRQIhAJnOv74IhwkOI5PiCX-icn6kLUdf1fPqfK4O0l5-g6crAiBAopo_ZxyDTuI8TtEEZt8q2Y4y4i7CmQ2ZvrrDE7kaeQ:QUQ3MjNmeGpyRzRGRjZ4QnZvLTVYcE1tejZSeGx3ckJ0R092M1QwcEQ0YUFVb2ltRjQtd01NYThyOW9HZWJXZWI4YnVDOXdZMFFxTHpLRGpCYkRSWllTY2Z2WTdtRXl2TVJOcnVUeDdQVHF3M3hrdGhPZ0hwUEZMTXM1VmZmemUzc3hTXzFTTld5aTFLcHAwSFgzRDVSOG56Ung1eWRFQld3',
      'SIDCC=AKEyXzU61hMDWrX8n0hwIRzhqaK6RsrG_wcaTwHQ_e0GvezIYZQhpbXdU37WE8TjoZU0thD3sQ',
      '__Secure-1PSIDCC=AKEyXzW0GY_DSFKPQd6Wr6tYdndDXi5p5cSLWncPrnlZTJLGmPWHNcVlfCyYcoJQFBwyia5s',
      '__Secure-3PSIDCC=AKEyXzWukke57_8MpeD4cj0pyQqp90a1Cqmn9chs6gFXowQsFEqESXDtYV87lXO69m143q8d',
      'VISITOR_INFO1_LIVE=wHzK3izM8mc',
    ].join('; '),
  },
});

module.exports = {
  name: 'play',
  description: 'Search YouTube and play a song in your voice channel',
  usage: '.play <song name or URL>',

  async execute(message, args) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('❌ You need to be in a voice channel first.');
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return message.reply('❌ I need **Connect** and **Speak** permissions in your voice channel.');
    }

    if (!args.length) {
      return message.reply('❌ Please provide a song name or URL. Usage: `.play <song>`');
    }

    const query = args.join(' ');
    const searching = await message.reply(`🔍 Searching for **${query}**...`);

    try {
      let videoUrl, videoTitle, videoDuration, videoThumbnail;

      // Direct URL or search
      if (playdl.yt_validate(query) === 'video') {
        const info = await playdl.video_info(query);
        videoUrl = query;
        videoTitle = info.video_details.title;
        videoDuration = info.video_details.durationRaw;
        videoThumbnail = info.video_details.thumbnails?.at(-1)?.url;
      } else {
        const results = await playdl.search(query, { limit: 5, source: { youtube: 'video' } });
        const video = results?.find(r => r?.url && playdl.yt_validate(r.url) === 'video');
        if (!video) {
          return searching.edit('❌ No results found for that search.');
        }
        videoUrl = video.url;
        videoTitle = video.title;
        videoDuration = video.durationRaw;
        videoThumbnail = video.thumbnails?.at(-1)?.url;
      }

      // Validate URL before streaming
      if (!videoUrl || playdl.yt_validate(videoUrl) !== 'video') {
        return searching.edit('❌ Could not find a valid video for that search.');
      }

      // Get audio stream
      const stream = await playdl.stream(videoUrl, { quality: 2 });
      const resource = createAudioResource(stream.stream, { inputType: stream.type });

      // Join VC
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

      const player = createAudioPlayer();
      connection.subscribe(player);
      player.play(resource);

      // Save to music store so .stop can access it
      message.client.musicStore.set(message.guild.id, { player, connection });

      // Now playing embed
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${videoTitle}](${videoUrl})**`)
        .addFields({ name: 'Duration', value: videoDuration || 'Unknown', inline: true })
        .setThumbnail(videoThumbnail || null)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      await searching.edit({ content: '', embeds: [embed] });

      // Leave when song ends
      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
        message.client.musicStore.delete(message.guild.id);
      });

      player.on('error', (err) => {
        console.error('[PLAY ERROR]', err.message);
        connection.destroy();
        message.client.musicStore.delete(message.guild.id);
        message.channel.send('❌ An error occurred while playing the song.').catch(() => {});
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          connection.destroy();
        }
      });

    } catch (err) {
      console.error('[PLAY ERROR]', err.message);
      searching.edit(`❌ Something went wrong: \`${err.message}\``).catch(() => {});
    }
  },
};
