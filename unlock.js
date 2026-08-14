const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

function hasManageChannelsPermission(member, userId) {
  if (ADMIN_BYPASS_USERS.includes(userId || member?.id)) return true;
  return member?.permissions?.has(PermissionsBitField.Flags.ManageChannels) || false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a previously locked channel')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),

  async execute(interaction) {
    if (!hasManageChannelsPermission(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '❌ You do not have permission to manage channels.', ephemeral: true });
    }

    try {
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null,
      });

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🔓 Channel Unlocked')
        .setDescription('This channel has been unlocked.')
        .setFooter({ text: `Unlocked by ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to unlock the channel.', ephemeral: true });
    }
  },

  async prefixExecute(message, args, client) {
    if (!hasManageChannelsPermission(message.member, message.author.id)) {
      return message.reply('❌ You do not have permission to manage channels.');
    }

    try {
      await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
        SendMessages: null,
      });

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🔓 Channel Unlocked')
        .setDescription('This channel has been unlocked.')
        .setFooter({ text: `Unlocked by ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      message.reply('❌ Failed to unlock the channel.');
    }
  },
};
