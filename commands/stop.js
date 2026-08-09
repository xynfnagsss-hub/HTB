module.exports = {
  name: 'stop',
  description: 'Stop the music and leave the voice channel',
  usage: '.stop',

  async execute(message, args, client) {
    const queue = client.distube.getQueue(message.guild.id);
    if (!queue) return message.reply('❌ Nothing is playing right now.');

    await client.distube.stop(message.guild.id);
    message.reply('⏹️ Stopped the music and left the voice channel.');
  },
};
