const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { ensureNativeAutoModRule, DEFAULT_PROTECTED_USER_IDS } = require('../utils/ensureAutoModRule');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antiping')
    .setDescription('Setup or refresh native Discord AutoMod Anti-Ping protection')
    .addUserOption(opt =>
      opt.setName('user').setDescription('Additional user to protect from pings').setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  async execute(interaction) {
    const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id);
    if (!isBypass && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: '❌ You do not have permission to manage server settings.', ephemeral: true });
    }

    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user');
    const extraIds = targetUser ? [targetUser.id] : [];

    const res = await ensureNativeAutoModRule(interaction.guild, extraIds);

    if (res.success) {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('🛡️ Native AutoMod Anti-Ping Active')
        .setDescription('Discord will now automatically **block messages before they are sent** whenever someone tries to ping the protected users.')
        .addFields(
          { name: 'Protected Users', value: (res.protectedIds || DEFAULT_PROTECTED_USER_IDS).map(id => `<@${id}> (\`${id}\`)`).join('\n') },
          { name: 'Action Taken by Discord', value: '🚫 **BlockMessage** (0 notification pings)' }
        )
        .setFooter({ text: 'HTB Security System' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.editReply({
        content: `❌ Could not create native AutoMod rule: \`${res.reason}\`\n👉 **Make sure the bot has the "Manage Server" (Manage Guild) permission in Server Settings > Roles!**`
      });
    }
  },

  async prefixExecute(message, args, client) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ You do not have permission to manage server settings.');
    }

    const extraIds = [];
    if (message.mentions?.users?.size > 0) {
      for (const u of message.mentions.users.values()) {
        extraIds.push(u.id);
      }
    }
    if (args.length > 0) {
      for (const a of args) {
        const idMatch = a.match(/\d{17,20}/);
        if (idMatch && !extraIds.includes(idMatch[0])) {
          extraIds.push(idMatch[0]);
        }
      }
    }

    const statusMsg = await message.channel.send('⚙️ Setting up native Discord AutoMod Anti-Ping rule...');
    const res = await ensureNativeAutoModRule(message.guild, extraIds);

    if (res.success) {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle('🛡️ Native AutoMod Anti-Ping Active')
        .setDescription('Discord will now automatically **block messages before they are sent** whenever someone tries to ping the protected users.')
        .addFields(
          { name: 'Protected Users', value: (res.protectedIds || DEFAULT_PROTECTED_USER_IDS).map(id => `<@${id}> (\`${id}\`)`).join('\n') },
          { name: 'Action Taken by Discord', value: '🚫 **BlockMessage** (0 notification pings)' }
        )
        .setFooter({ text: 'HTB Security System' })
        .setTimestamp();

      await statusMsg.edit({ content: '', embeds: [embed] });
    } else {
      await statusMsg.edit(`❌ Could not create native AutoMod rule: \`${res.reason}\`\n👉 **Make sure the bot has the "Manage Server" (Manage Guild) permission in Server Settings > Roles!**`);
    }
  }
};
