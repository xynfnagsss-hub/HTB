const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

function hasManageChannelsPermission(member, userId) {
  if (ADMIN_BYPASS_USERS.includes(userId || member?.id)) return true;
  return member?.permissions?.has(PermissionsBitField.Flags.ManageChannels) || false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode on this channel')
    .addIntegerOption(opt =>
      opt.setName('seconds').setDescription('Slowmode in seconds (0 to disable, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),

  async execute(interaction) {
    if (!hasManageChannelsPermission(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '❌ You do not have permission to manage channels.', ephemeral: true });
    }

    const seconds = interaction.options.getInteger('seconds');

    try {
      await interaction.channel.setRateLimitPerUser(seconds);

      await interaction.reply({
        content: seconds === 0
          ? `✅ Slowmode disabled in ${interaction.channel}.`
          : `✅ Slowmode set to **${seconds}s** in ${interaction.channel}.`,
      });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to set slowmode.', ephemeral: true });
    }
  },

  async prefixExecute(message, args, client) {
    if (!hasManageChannelsPermission(message.member, message.author.id)) {
      return message.reply('❌ You do not have permission to manage channels.');
    }

    if (!args.length) {
      return message.reply('❌ Usage: `.slowmode <seconds>` (use `0` to disable)');
    }

    const seconds = parseInt(args[0], 10);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply('❌ Seconds must be a valid number between 0 and 21600.');
    }

    try {
      await message.channel.setRateLimitPerUser(seconds);

      await message.reply(
        seconds === 0
          ? `✅ Slowmode disabled in this channel.`
          : `✅ Slowmode set to **${seconds}s** in this channel.`
      );
    } catch (err) {
      console.error(err);
      message.reply('❌ Failed to set slowmode.');
    }
  },
};
