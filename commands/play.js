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
const yts = require('yt-search');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

const BIN_PATH = path.join(__dirname, '../bin/yt-dlp');

async function downloadYtDlp() {
  const dir = path.dirname(BIN_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  console.log('[yt-dlp] Downloading binary...');
  const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
  await new Promise((resolve, reject) => {
    function get(u) {
      https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) return get(res.headers.location);
        const file = fs.createWriteStream(BIN_PATH);
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', reject);
      }).on('error', reject);
    }
    get(url);
  });
  fs.chmodSync(BIN_PATH, '755');
  console.log('[yt-dlp] Downloaded OK');
}

let ytDlpBin = null;
async function getYtDlpBin() {
  if (ytDlpBin) return ytDlpBin;
  // Try system install first
  try {
    execFileSync('yt-dlp', ['--version'], { timeout: 5000 });
    ytDlpBin = 'yt-dlp';
    console.log('[yt-dlp] Using system binary');
    return ytDlpBin;
  } catch {}
  // Try cached download
  if (!fs.existsSync(BIN_PATH)) await downloadYtDlp();
  ytDlpBin = BIN_PATH;
  return ytDlpBin;
}

const COOKIE_STR = [
  'HSID=AUolAcz8zuPf-xvQ1',
  'SSID=AH1T_BTRbgNBGEQq-',
  'APISID=NzQ-RC2HeBedA3gY/AHQBw8ewNjHdphGeY',
  'SAPISID=sBWBF6e56Kp83vUo/AufRiJF3yXRsryCR7',
  'SID=g.a000BQnkHqZ-CNI5YymIojqN92SA7Z7jCTIFLzXKiEgwQSo-b5LuayV25PwsaNSXP3QeXk2SQwACgYKAQ0SARYSFQHGX2Midj2G3YqqA3Lv0ByAvfunuBoVAUF8yKqMuthW8dxc-hwQahpJQEIy0076',
  '__Secure-1PSID=g.a000BQnkHqZ-CNI5YymIojqN92SA7Z7jCTIFLzXKiEgwQSo-b5Lu7ryTV8p99kOeTdLd-4V8PAACgYKAdISARYSFQHGX2MigK4iuAyBPkh93LFGkCmOIhoVAUF8yKp19iblY_TrjbRPNlrx1s2H0076',
  '__Secure-3PSID=g.a000BQnkHqZ-CNI5YymIojqN92SA7Z7jCTIFLzXKiEgwQSo-b5LuGRDT5sNqA9OLyDwNmu9s7gACgYKAS0SARYSFQHGX2MiGQlu24jl_ApvNZAjc8_apBoVAUF8yKpiSINtLpzpyovr_su2c6BF0076',
  'SIDCC=AKEyXzU61hMDWrX8n0hwIRzhqaK6RsrG_wcaTwHQ_e0GvezIYZQhpbXdU37WE8TjoZU0thD3sQ',
  '__Secure-1PSIDCC=AKEyXzW0GY_DSFKPQd6Wr6tYdndDXi5p5cSLWncPrnlZTJLGmPWHNcVlfCyYcoJQFBwyia5s',
  '__Secure-3PSIDCC=AKEyXzWukke57_8MpeD4cj0pyQqp90a1Cqmn9chs6gFXowQsFEqESXDtYV87lXO69m143q8d',
  'VISITOR_INFO1_LIVE=wHzK3izM8mc',
  'LOGIN_INFO=AFmmF2swRQIhAJnOv74IhwkOI5PiCX-icn6kLUdf1fPqfK4O0l5-g6crAiBAopo_ZxyDTuI8TtEEZt8q2Y4y4i7CmQ2ZvrrDE7kaeQ:QUQ3MjNmeGpyRzRGRjZ4QnZvLTVYcE1tejZSeGx3ckJ0R092M1QwcEQ0YUFVb2ltRjQtd01NYThyOW9HZWJXZWI4YnVDOXdZMFFxTHpLRGpCYkRSWllTY2Z2WTdtRXl2TVJOcnVUeDdQVHF3M3hrdGhPZ0hwUEZMTXM1VmZmemUzc3hTXzFTTld5aTFLcHAwSFgzRDVSOG56Ung1eWRFQld3',
].join('; ');

function getAudioStream(bin, url) {
  const proc = spawn(bin, [
    '--no-playlist',
    '--no-warnings',
    '-f', 'bestaudio[ext=webm]/bestaudio[ext=mp4]/bestaudio/best',
    '--add-header', `Cookie:${COOKIE_STR}`,
    '--add-header', 'User-Agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    '-o', '-',
    url,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  proc.stderr.on('data', d => {
    const line = d.toString().trim();
    if (line) console.error('[yt-dlp]', line);
  });

  proc.on('error', (err) => console.error('[yt-dlp spawn error]', err.message));

  return proc;
}

module.exports = {
  name: 'play',
  description: 'Search YouTube and play a song in your voice channel',
  usage: '.play <song name or URL>',

  async execute(message, args) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ You need to be in a voice channel first.');

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return message.reply('❌ I need **Connect** and **Speak** permissions.');
    }

    if (!args.length) return message.reply('❌ Usage: `.play <song name or URL>`');

    const query = args.join(' ');
    const statusMsg = await message.channel.send(`🔍 Searching for **${query}**...`);

    try {
      let videoUrl, videoTitle, videoDuration, videoThumbnail;
      const isUrl = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/.test(query);

      if (isUrl) {
        videoUrl = query;
        videoTitle = query;
        videoDuration = 'Unknown';
        videoThumbnail = null;
      } else {
        const result = await yts(query);
        const video = result?.videos?.[0];
        if (!video) return statusMsg.edit('❌ No results found.');
        videoUrl = video.url;
        videoTitle = video.title;
        videoDuration = video.timestamp || 'Unknown';
        videoThumbnail = video.thumbnail || null;
      }

      await statusMsg.edit(`⏳ Connecting...`);

      const bin = await getYtDlpBin();
      const proc = getAudioStream(bin, videoUrl);

      const resource = createAudioResource(proc.stdout, { inputType: StreamType.Arbitrary });

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

      const player = createAudioPlayer();
      connection.subscribe(player);
      player.play(resource);

      message.client.musicStore.set(message.guild.id, { player, connection, proc });

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🎵 Now Playing')
        .setDescription(`**[${videoTitle}](${videoUrl})**`)
        .addFields({ name: 'Duration', value: String(videoDuration), inline: true })
        .setThumbnail(videoThumbnail || null)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      await statusMsg.edit({ content: '', embeds: [embed] });

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
        try { proc.kill(); } catch {}
        message.client.musicStore.delete(message.guild.id);
      });

      player.on('error', (err) => {
        console.error('[PLAYER ERROR]', err.message);
        connection.destroy();
        try { proc.kill(); } catch {}
        message.client.musicStore.delete(message.guild.id);
        message.channel.send('❌ Playback error.').catch(() => {});
      });

      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch {
          connection.destroy();
          try { proc.kill(); } catch {}
          message.client.musicStore.delete(message.guild.id);
        }
      });

    } catch (err) {
      console.error('[PLAY ERROR]', err.message);
      statusMsg.edit(`❌ Something went wrong: \`${err.message}\``).catch(() => {});
    }
  },
};
