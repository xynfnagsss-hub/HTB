const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

function hasModeratePermission(member, userId) {
  if (ADMIN_BYPASS_USERS.includes(userId || member?.id)) return true;
  return member?.permissions?.has(PermissionsBitField.Flags.ModerateMembers) || false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout (unmute) from a member')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to unmute').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the unmute').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  async execute(interaction) {
    if (!hasModeratePermission(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '❌ You do not have permission to moderate members.', ephemeral: true });
    }

    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (!target.communicationDisabledUntil) return interaction.reply({ content: '❌ That user is not currently muted.', ephemeral: true });

    try {
      await target.timeout(null, `${reason} | Unmuted by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🔊 Member Unmuted')
        .addFields(
          { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to unmute that user.', ephemeral: true });
    }
  },

  async prefixExecute(message, args, client) {
    if (!hasModeratePermission(message.member, message.author.id)) {
      return message.reply('❌ You do not have permission to unmute members.');
    }

    if (!args.length) {
      return message.reply('❌ Usage: `.unmute <@user/userId> [reason]`');
    }

    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null);
    if (!target) return message.reply('❌ User not found.');
    if (!target.communicationDisabledUntil) return message.reply('❌ That user is not currently muted.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await target.timeout(null, `${reason} | Unmuted by ${message.author.tag}`);

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🔊 Member Unmuted')
        .addFields(
          { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Moderator', value: message.author.tag, inline: true },
          { name: 'Reason', value: reason },
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      message.reply('❌ Failed to unmute that user.');
    }
  },
};
