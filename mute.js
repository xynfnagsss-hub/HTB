const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

function hasModeratePermission(member, userId) {
  if (ADMIN_BYPASS_USERS.includes(userId || member?.id)) return true;
  return member?.permissions?.has(PermissionsBitField.Flags.ModerateMembers) || false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member for a specified duration')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to mute').setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('duration').setDescription('Duration in minutes (max 40320)').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the mute').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  async execute(interaction) {
    if (!hasModeratePermission(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '❌ You do not have permission to moderate members.', ephemeral: true });
    }

    const target = interaction.options.getMember('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot mute yourself.', ephemeral: true });

    try {
      await target.timeout(duration * 60 * 1000, `${reason} | Muted by ${interaction.user.tag}`);

      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setThumbnail(target.user.displayAvatarURL())
        .setTitle('🔇 Member Muted')
        .addFields(
          { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Duration', value: `${duration} minute(s)`, inline: true },
          { name: 'Reason', value: reason },
        )
        .setFooter({ text: `Muted by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to mute that user.', ephemeral: true });
    }
  },

  async prefixExecute(message, args, client) {
    if (!hasModeratePermission(message.member, message.author.id)) {
      return message.reply('❌ You do not have permission to mute members.');
    }

    if (args.length < 2) {
      return message.reply('❌ Usage: `.mute <@user/userId> <minutes> [reason]`');
    }

    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null);
    if (!target) return message.reply('❌ User not found.');
    if (target.id === message.author.id) return message.reply('❌ You cannot mute yourself.');

    const duration = parseInt(args[1], 10);
    if (isNaN(duration) || duration <= 0 || duration > 40320) {
      return message.reply('❌ Duration must be a valid number of minutes between 1 and 40320.');
    }

    const reason = args.slice(2).join(' ') || 'No reason provided';

    try {
      await target.timeout(duration * 60 * 1000, `${reason} | Muted by ${message.author.tag}`);

      const embed = new EmbedBuilder()
        .setColor(0xffff00)
        .setThumbnail(target.user.displayAvatarURL())
        .setTitle('🔇 Member Muted')
        .addFields(
          { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Moderator', value: message.author.tag, inline: true },
          { name: 'Duration', value: `${duration} minute(s)`, inline: true },
          { name: 'Reason', value: reason },
        )
        .setFooter({ text: `Muted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      message.reply('❌ Failed to mute that user.');
    }
  },
};
