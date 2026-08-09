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
const { exec } = require('child_process');
const { createWriteStream, unlinkSync, existsSync } = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Search YouTube using yt-search (no API key needed)
const yts = require('yt-search');

async function searchYouTube(query) {
  const result = await yts(query);
  const videos = result.videos;
  if (!videos || videos.length === 0) return null;
  return videos[0];
}

// Get direct audio stream URL via yt-dlp subprocess
function getAudioUrl(videoUrl) {
  return new Promise((resolve, reject) => {
    // Try yt-dlp first, fall back to youtube-dl
    const cmd = `yt-dlp -f bestaudio --get-url "${videoUrl}"`;
    exec(cmd, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err || !stdout.trim()) {
        reject(new Error('yt-dlp not available: ' + (stderr || err?.message)));
        return;
      }
      resolve(stdout.trim().split('\n')[0]);
    });
  });
}

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
    const searching = await message.reply(`🔍 Searching for **${query}**..`);

    try {
      // Search or validate URL
      let videoUrl, videoTitle, videoDuration, videoThumbnail;

      const isUrl = query.startsWith('http://') || query.startsWith('https://');
      if (isUrl) {
        videoUrl = query;
        videoTitle = query;
        videoDuration = 'Unknown';
        videoThumbnail = null;
      } else {
        const video = await searchYouTube(query);
        if (!video) return searching.edit('❌ No results found.');
        videoUrl = video.url;
        videoTitle = video.title;
        videoDuration = video.timestamp || 'Unknown';
        videoThumbnail = video.thumbnail || null;
      }

      await searching.edit(`⏳ Loading **${videoTitle}**...`);

      // Build cookies string for ytdl
      const cookieStr = [
        'HSID=AUolAcz8zuPf-xvQ1',
        'SSID=AH1T_BTRbgNBGEQq-',
        'APISID=NzQ-RC2HeBedA3gY/AHQBw8ewNjHdphGeY',
        'SAPISID=sBWBF6e56Kp83vUo/AufRiJF3yXRsryCR7',
        '__Secure-1PAPISID=sBWBF6e56Kp83vUo/AufRiJF3yXRsryCR7',
        '__Secure-3PAPISID=sBWBF6e56Kp83vUo/AufRiJF3yXRsryCR7',
        'SID=g.a000BQnkHqZ-CNI5YymIojqN92SA7Z7jCTIFLzXKiEgwQSo-b5LuayV25PwsaNSXP3QeXk2SQwACgYKAQ0SARYSFQHGX2Midj2G3YqqA3Lv0ByAvfunuBoVAUF8yKqMuthW8dxc-hwQahpJQEIy0076',
        '__Secure-1PSID=g.a000BQnkHqZ-CNI5YymIojqN92SA7Z7jCTIFLzXKiEgwQSo-b5Lu7ryTV8p99kOeTdLd-4V8PAACgYKAdISARYSFQHGX2MigK4iuAyBPkh93LFGkCmOIhoVAUF8yKp19iblY_TrjbRPNlrx1s2H0076',
        '__Secure-3PSID=g.a000BQnkHqZ-CNI5YymIojqN92SA7Z7jCTIFLzXKiEgwQSo-b5LuGRDT5sNqA9OLyDwNmu9s7gACgYKAS0SARYSFQHGX2MiGQlu24jl_ApvNZAjc8_apBoVAUF8yKpiSINtLpzpyovr_su2c6BF0076',
        'SIDCC=AKEyXzU61hMDWrX8n0hwIRzhqaK6RsrG_wcaTwHQ_e0GvezIYZQhpbXdU37WE8TjoZU0thD3sQ',
        '__Secure-1PSIDCC=AKEyXzW0GY_DSFKPQd6Wr6tYdndDXi5p5cSLWncPrnlZTJLGmPWHNcVlfCyYcoJQFBwyia5s',
        '__Secure-3PSIDCC=AKEyXzWukke57_8MpeD4cj0pyQqp90a1Cqmn9chs6gFXowQsFEqESXDtYV87lXO69m143q8d',
        'VISITOR_INFO1_LIVE=wHzK3izM8mc',
        'LOGIN_INFO=AFmmF2swRQIhAJnOv74IhwkOI5PiCX-icn6kLUdf1fPqfK4O0l5-g6crAiBAopo_ZxyDTuI8TtEEZt8q2Y4y4i7CmQ2ZvrrDE7kaeQ:QUQ3MjNmeGpyRzRGRjZ4QnZvLTVYcE1tejZSeGx3ckJ0R092M1QwcEQ0YUFVb2ltRjQtd01NYThyOW9HZWJXZWI4YnVDOXdZMFFxTHpLRGpCYkRSWllTY2Z2WTdtRXl2TVJOcnVUeDdQVHF3M3hrdGhPZ0hwUEZMTXM1VmZmemUzc3hTXzFTTld5aTFLcHAwSFgzRDVSOG56Ung1eWRFQld3',
      ].join('; ');

      // Use ytdl-core with cookies as a readable stream
      const ytdl = require('ytdl-core');
      const stream = ytdl(videoUrl, {
        filter: 'audioonly',
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        requestOptions: {
          headers: {
            cookie: cookieStr,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        },
      });

      stream.on('error', (err) => {
        console.error('[STREAM ERROR]', err.message);
      });

      const resource = createAudioResource(stream, { inputType: StreamType.Arbitrary });

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

      message.client.musicStore.set(message.guild.id, { player, connection });

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${videoTitle}](${videoUrl})**`)
        .addFields({ name: 'Duration', value: String(videoDuration), inline: true })
        .setThumbnail(videoThumbnail || null)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      await searching.edit({ content: '', embeds: [embed] });

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
        message.client.musicStore.delete(message.guild.id);
      });

      player.on('error', (err) => {
        console.error('[PLAYER ERROR]', err.message);
        connection.destroy();
        message.client.musicStore.delete(message.guild.id);
        message.channel.send('❌ Playback error occurred.').catch(() => {});
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          connection.destroy();
          message.client.musicStore.delete(message.guild.id);
        }
      });

    } catch (err) {
      console.error('[PLAY ERROR]', err.message);
      searching.edit(`❌ Something went wrong: \`${err.message}\``).catch(() => {});
    }
  },
};
