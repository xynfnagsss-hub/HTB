const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song, playlist, or artist in your voice channel')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('Song title, YouTube/Spotify/SoundCloud URL, or artist')
        .setRequired(true)),

  async execute(interaction) {
    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ You must join a voice channel first.', ephemeral: true });
    }

    const query = interaction.options.getString('query').trim();
    await interaction.deferReply();

    try {
      await interaction.client.distube.play(voiceChannel, query, {
        textChannel: interaction.channel,
        member: interaction.member,
      });
      await interaction.editReply({ content: `🔍 Searching & loading **${query}**...` });
    } catch (err) {
      console.error('[PLAY ERROR]:', err);
      await interaction.editReply({ content: `❌ Could not play: \`${err.message}\`` }).catch(() => {});
    }
  },

  async prefixExecute(message, args, client) {
    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
      return message.reply('❌ You must join a voice channel first.');
    }

    if (!args.length) {
      return message.reply('⚠️ Usage: `.play <song title, artist, or URL>`');
    }

    const query = args.join(' ').trim();
    const statusMsg = await message.channel.send(`🔍 Searching for **${query}**...`);

    try {
      await client.distube.play(voiceChannel, query, {
        textChannel: message.channel,
        member: message.member,
        message,
      });
      statusMsg.delete().catch(() => {});
    } catch (err) {
      console.error('[PLAY PREFIX ERROR]:', err);
      statusMsg.edit(`❌ Could not play: \`${err.message}\``).catch(() => {});
    }
  }
};
