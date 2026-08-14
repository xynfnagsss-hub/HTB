const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip to the next song in the queue'),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue || !queue.songs.length) {
      return interaction.reply({ content: '❌ Nothing is playing to skip.', ephemeral: true });
    }

    try {
      const song = await queue.skip();
      await interaction.reply(`⏭️ Skipped! Now playing **${song.name}**.`);
    } catch (e) {
      await queue.stop();
      await interaction.reply('⏭️ Skipped track! (End of queue).');
    }
  },

  async prefixExecute(message, args, client) {
    const queue = client.distube.getQueue(message.guildId);
    if (!queue || !queue.songs.length) {
      return message.reply('❌ Nothing is playing to skip.');
    }

    try {
      const song = await queue.skip();
      await message.reply(`⏭️ Skipped! Now playing **${song.name}**.`);
    } catch (e) {
      await queue.stop();
      await message.reply('⏭️ Skipped track! (End of queue).');
    }
  }
};
