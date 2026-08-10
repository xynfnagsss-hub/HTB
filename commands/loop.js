const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { MusicManager } = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the loop mode (off, track, queue)')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('Loop mode')
        .setRequired(false)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Current Track', value: 'track' },
          { name: 'Entire Queue', value: 'queue' },
        )),

  async execute(interaction) {
    const musicManager = new MusicManager(interaction.client);
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    let mode = interaction.options.getString('mode');
    if (!mode) {
      // Cycle: off -> track -> queue -> off
      if (queue.loopMode === 'off') mode = 'track';
      else if (queue.loopMode === 'track') mode = 'queue';
      else mode = 'off';
    }

    queue.loopMode = mode;
    const embed = new EmbedBuilder()
      .setColor(0x5765f2)
      .setTitle('🔁 Loop Mode Updated')
      .setDescription(`Loop mode is now set to: **${mode.toUpperCase()}**`)
      .setFooter({ text: `Set by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    const musicManager = new MusicManager(client);
    const queue = musicManager.getQueue(message.guild.id);

    if (!queue || !queue.currentTrack) {
      return message.reply('❌ Nothing is playing right now.');
    }

    let mode = args[0]?.toLowerCase();
    if (!['off', 'track', 'queue'].includes(mode)) {
      if (queue.loopMode === 'off') mode = 'track';
      else if (queue.loopMode === 'track') mode = 'queue';
      else mode = 'off';
    }

    queue.loopMode = mode;
    const embed = new EmbedBuilder()
      .setColor(0x5765f2)
      .setTitle('🔁 Loop Mode Updated')
      .setDescription(`Loop mode is now set to: **${mode.toUpperCase()}**`)
      .setFooter({ text: `Set by ${message.author.tag}` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
