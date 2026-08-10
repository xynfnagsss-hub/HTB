const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

function hasManageChannelsPermission(member, userId) {
  if (ADMIN_BYPASS_USERS.includes(userId || member?.id)) return true;
  return member?.permissions?.has(PermissionsBitField.Flags.ManageChannels) || false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel so only staff can send messages')
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for locking').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),

  async execute(interaction) {
    if (!hasManageChannelsPermission(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '❌ You do not have permission to manage channels.', ephemeral: true });
    }

    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
      });

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🔒 Channel Locked')
        .setDescription(`This channel has been locked.\n**Reason:** ${reason}`)
        .setFooter({ text: `Locked by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to lock the channel.', ephemeral: true });
    }
  },

  async prefixExecute(message, args, client) {
    if (!hasManageChannelsPermission(message.member, message.author.id)) {
      return message.reply('❌ You do not have permission to manage channels.');
    }

    const reason = args.join(' ') || 'No reason provided';

    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: false,
      });

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🔒 Channel Locked')
        .setDescription(`This channel has been locked.\n**Reason:** ${reason}`)
        .setFooter({ text: `Locked by ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      message.reply('❌ Failed to lock the channel.');
    }
  },
};
