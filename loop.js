const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Change loop mode (off / song / queue)')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Loop mode')
        .setRequired(false)
        .addChoices(
          { name: 'Off', value: '0' },
          { name: 'Repeat Song', value: '1' },
          { name: 'Repeat Queue', value: '2' }
        )),

  async execute(interaction) {
    const queue = interaction.client.distube.getQueue(interaction.guildId);
    if (!queue) return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });

    const mode = interaction.options.getString('mode');
    let newMode;
    if (mode !== null) {
      newMode = parseInt(mode);
    } else {
      newMode = (queue.repeatMode + 1) % 3;
    }

    queue.setRepeatMode(newMode);
    const modeNames = ['Disabled (Off)', 'Repeat Current Song 🔂', 'Repeat Entire Queue 🔁'];
    await interaction.reply(`🔄 Loop mode set to: **${modeNames[newMode]}**`);
  },

  async prefixExecute(message, args, client) {
    const queue = client.distube.getQueue(message.guildId);
    if (!queue) return message.reply('❌ Nothing is playing right now.');

    let newMode;
    if (args[0]) {
      const a = args[0].toLowerCase();
      if (a === 'off' || a === '0') newMode = 0;
      else if (a === 'song' || a === 'track' || a === '1') newMode = 1;
      else if (a === 'queue' || a === 'all' || a === '2') newMode = 2;
      else newMode = (queue.repeatMode + 1) % 3;
    } else {
      newMode = (queue.repeatMode + 1) % 3;
    }

    queue.setRepeatMode(newMode);
    const modeNames = ['Disabled (Off)', 'Repeat Current Song 🔂', 'Repeat Entire Queue 🔁'];
    await message.reply(`🔄 Loop mode set to: **${modeNames[newMode]}**`);
  }
};
