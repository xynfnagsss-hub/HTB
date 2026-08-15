const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

function hasBanPermission(member, userId) {
  if (ADMIN_BYPASS_USERS.includes(userId || member?.id)) return true;
  return member?.permissions?.has(PermissionsBitField.Flags.BanMembers) || false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(opt =>
      opt.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the ban').setRequired(false)),

  async execute(interaction) {
    if (!hasBanPermission(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '❌ You do not have permission to ban members.', ephemeral: true });
    }

    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: '❌ User not found.', ephemeral: true });
    if (!target.bannable) return interaction.reply({ content: '❌ I cannot ban that user. They may have a higher role than me.', ephemeral: true });
    if (target.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot ban yourself.', ephemeral: true });

    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🔨 You have been banned')
            .setDescription(`**Server:** ${interaction.guild.name}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
            .setFooter({ text: 'TNM Moderation • Trust No Mob', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
            .setTimestamp(),
        ],
      }).catch(() => {});

      await target.ban({ reason: `${reason} | Banned by ${interaction.user.tag}` });

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🔨 Member Banned')
        .setThumbnail(target.user.displayAvatarURL())
        .addFields(
          { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason },
        )
        .setFooter({ text: `Banned by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      interaction.reply({ content: '❌ Failed to ban that user.', ephemeral: true });
    }
  },

  async prefixExecute(message, args, client) {
    if (!hasBanPermission(message.member, message.author.id)) {
      return message.reply('❌ You do not have permission to ban members.');
    }

    if (!args.length) {
      return message.reply('❌ Usage: `.ban <@user/userId> [reason]`');
    }

    const target = message.mentions.members.first() || await message.guild.members.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null);
    if (!target) return message.reply('❌ User not found.');
    if (!target.bannable) return message.reply('❌ I cannot ban that user. They may have a higher role than me.');
    if (target.id === message.author.id) return message.reply('❌ You cannot ban yourself.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await target.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🔨 You have been banned')
            .setDescription(`**Server:** ${message.guild.name}\n**Reason:** ${reason}\n**Moderator:** ${message.author.tag}`)
            .setFooter({ text: 'TNM Moderation • Trust No Mob', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
            .setTimestamp(),
        ],
      }).catch(() => {});

      await target.ban({ reason: `${reason} | Banned by ${message.author.tag}` });

      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('🔨 Member Banned')
        .setThumbnail(target.user.displayAvatarURL())
        .addFields(
          { name: 'User', value: `${target.user.tag} (${target.id})`, inline: true },
          { name: 'Moderator', value: message.author.tag, inline: true },
          { name: 'Reason', value: reason },
        )
        .setFooter({ text: `Banned by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      message.reply('❌ Failed to ban that user.');
    }
  },
};
