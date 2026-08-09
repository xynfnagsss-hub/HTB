module.exports = {
  name: 'play',
  description: 'Search YouTube and play a song in your voice channel',
  usage: '.play <song name or URL>',

  async execute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) return message.reply('❌ You need to be in a voice channel first.');

    if (!args.length) return message.reply('❌ Usage: `.play <song name or URL>`');

    const query = args.join(' ');

    // If not a URL, prefix with ytsearch: so yt-dlp knows to search YouTube
    const isUrl = /^https?:\/\//.test(query);
    const input = isUrl ? query : `ytsearch:${query}`;

    try {
      await client.distube.play(voiceChannel, input, {
        member: message.member,
        textChannel: message.channel,
        message,
      });
    } catch (err) {
      console.error('[PLAY ERROR]', err);
      message.channel.send(`❌ Something went wrong: \`${err.message}\``).catch(() => {});
    }
  },
};
