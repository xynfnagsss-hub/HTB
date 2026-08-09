module.exports = {
  name: 'stop',
  description: 'Stop the current song and leave the voice channel',
  usage: '.stop',

  async execute(message, args, client) {
    const music = client.musicStore.get(message.guild.id);

    if (!music) {
      return message.reply('❌ Nothing is playing right now.');
    }

    music.player.stop();
    music.connection.destroy();
    if (music.proc) music.proc.kill();
    client.musicStore.delete(message.guild.id);

    message.reply('⏹️ Stopped the music and left the voice channel.');
  },
};
