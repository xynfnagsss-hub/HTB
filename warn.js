const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

function hasModeratePermission(member, userId) {
  if (ADMIN_BYPASS_USERS.includes(userId || member?.id)) return true;
  return member?.permissions?.has(PermissionsBitField.Flags.ModerateMembers) || false;
}

const warnings = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member and log it')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the warning').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  warnings,

  async execute(interaction) {
    if (!hasModeratePermission(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '❌ You do not have permission to moderate members.', ephemeral: true });
    }

    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot warn yourself.', ephemeral: true });

    const key = `${interaction.guild.id}-${target.id}`;
    if (!warnings.has(key)) warnings.set(key, []);
    warnings.get(key).push({ reason, mod: interaction.user.tag, date: new Date().toISOString() });

    const totalWarns = warnings.get(key).length;

    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle('⚠️ You have been warned')
          .setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}\n**Total Warnings:** ${totalWarns}`)
          .setFooter({ text: 'TNM Moderation • Trust No Mob', iconURL: 'https://xynfnagsss-hub.github.io/tnmwshop/favicon.png' })
          .setTimestamp(),
      ],
    }).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setThumbnail(target.user.displayAvatarURL())
      .setTitle('⚠️ Member Warned')
      .addFields(
        { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Total Warnings', value: `${totalWarns}`, inline: true },
        { name: 'Reason', value: reason },
      )
      .setFooter({ text: `Warned by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    if (!hasModeratePermission(message.member, message.author.id)) {
      return message.reply('❌ You do not have permission to warn members.');
    }

    if (!args.length) {
      return message.reply('❌ Usage: `.warn <@user/userId> [reason]`');
    }

    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null);
    if (!target) return message.reply('❌ User not found.');
    if (target.id === message.author.id) return message.reply('❌ You cannot warn yourself.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    const key = `${message.guild.id}-${target.id}`;
    if (!warnings.has(key)) warnings.set(key, []);
    warnings.get(key).push({ reason, mod: message.author.tag, date: new Date().toISOString() });

    const totalWarns = warnings.get(key).length;

    await target.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffaa00)
          .setTitle('⚠️ You have been warned')
          .setDescription(`**Server:** ${message.guild.name}\n**Reason:** ${reason}\n**Moderator:** ${message.author.tag}\n**Total Warnings:** ${totalWarns}`)
          .setFooter({ text: 'TNM Moderation • Trust No Mob', iconURL: 'https://xynfnagsss-hub.github.io/tnmwshop/favicon.png' })
          .setTimestamp(),
      ],
    }).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setThumbnail(target.user.displayAvatarURL())
      .setTitle('⚠️ Member Warned')
      .addFields(
        { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
        { name: 'Moderator', value: message.author.tag, inline: true },
        { name: 'Total Warnings', value: `${totalWarns}`, inline: true },
        { name: 'Reason', value: reason },
      )
      .setFooter({ text: `Warned by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
