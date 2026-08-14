const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const warnCommand = require('./warn');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

function hasModeratePermission(member, userId) {
  if (ADMIN_BYPASS_USERS.includes(userId || member?.id)) return true;
  return member?.permissions?.has(PermissionsBitField.Flags.ModerateMembers) || false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a member')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  async execute(interaction) {
    if (!hasModeratePermission(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '❌ You do not have permission to view warnings.', ephemeral: true });
    }

    const target = interaction.options.getMember('user');
    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });

    const key = `${interaction.guild.id}-${target.id}`;
    const userWarnings = warnCommand.warnings.get(key) || [];

    if (userWarnings.length === 0) {
      return interaction.reply({ content: `✅ **${target.user.tag}** has no warnings.`, ephemeral: true });
    }

    const warnList = userWarnings
      .map((w, i) => `**${i + 1}.** ${w.reason} — by ${w.mod} on ${new Date(w.date).toLocaleDateString()}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle(`⚠️ Warnings for ${target.user.tag}`)
      .setDescription(warnList)
      .setFooter({ text: `Total: ${userWarnings.length} warning(s)` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    if (!hasModeratePermission(message.member, message.author.id)) {
      return message.reply('❌ You do not have permission to view warnings.');
    }

    if (!args.length) {
      return message.reply('❌ Usage: `.warnings <@user/userId>`');
    }

    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null);
    if (!target) return message.reply('❌ User not found.');

    const key = `${message.guild.id}-${target.id}`;
    const userWarnings = warnCommand.warnings.get(key) || [];

    if (userWarnings.length === 0) {
      return message.reply(`✅ **${target.user.tag}** has no warnings.`);
    }

    const warnList = userWarnings
      .map((w, i) => `**${i + 1}.** ${w.reason} — by ${w.mod} on ${new Date(w.date).toLocaleDateString()}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xffaa00)
      .setTitle(`⚠️ Warnings for ${target.user.tag}`)
      .setDescription(warnList)
      .setFooter({ text: `Total: ${userWarnings.length} warning(s)` })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  },
};
