module.exports = {
  name: 'stop',
  description: 'Stop the music and leave the voice channel',
  usage: '.stop',

  async execute(message, args, client) {
    const music = client.musicStore.get(message.guild.id);
    if (!music) return message.reply('❌ Nothing is playing right now.');

    music.player.stop();
    music.connection.destroy();
    try { music.ytProc?.kill(); } catch {}
    try { music.ffmpegProc?.kill(); } catch {}
    client.musicStore.delete(message.guild.id);

    message.reply('⏹️ Stopped and left the voice channel.');
  },
};
