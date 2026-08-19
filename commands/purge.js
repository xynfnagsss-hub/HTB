const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { purgeAllChannelMessages } = require('../utils/purgeChannel');
const path = require('path');
const fs = require('fs');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Wipe messages, or strip a role from all members in the server.')
    .addSubcommand(sub =>
      sub
        .setName('messages')
        .setDescription('Purge messages from this channel.')
        .addIntegerOption(opt =>
          opt.setName('amount').setDescription('Number of messages to delete (1-100), or leave empty for all').setRequired(false).setMinValue(1).setMaxValue(100)
        )
        .addBooleanOption(opt =>
          opt.setName('all').setDescription('Delete ALL messages in this channel').setRequired(false)
        )
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Specific channel to clear').addChannelTypes(ChannelType.GuildText).setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('role')
        .setDescription('Strip a specific role from EVERY member who has it.')
        .addRoleOption(opt =>
          opt.setName('target').setDescription('The role to purge from all members').setRequired(true)
        )
    ),

  async execute(interaction) {
    const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id) ||
      interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles);

    if (!isBypass) {
      return interaction.reply({ content: '❌ You do not have permission to run this command.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'messages') {
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const amount = interaction.options.getInteger('amount');
      const clearAll = interaction.options.getBoolean('all');

      await interaction.deferReply({ ephemeral: true });

      try {
        if (clearAll || !amount) {
          await interaction.editReply({ content: `🧹 Purging all messages in <#${targetChannel.id}>... This may take a moment.` });
          const res = await purgeAllChannelMessages(targetChannel);
          await interaction.editReply({ content: `✅ Complete! Purged **${res.deleted}** message(s) from <#${targetChannel.id}>.` });
        } else {
          const deleted = await targetChannel.bulkDelete(amount, true);
          await interaction.editReply({ content: `🗑️ Deleted **${deleted.size}** message(s) from <#${targetChannel.id}>.` });
        }
      } catch (err) {
        console.error('[PURGE MESSAGES ERROR]', err);
        await interaction.editReply({ content: `❌ Error deleting messages: \`${err.message}\`` });
      }
      return;
    }

    if (sub === 'role') {
      const role = interaction.options.getRole('target');
      await interaction.deferReply();
      return handleRolePurge(interaction.guild, role, interaction.user, async (contentOrEmbed, isFinal = false) => {
        if (typeof contentOrEmbed === 'string') {
          await interaction.editReply({ content: contentOrEmbed }).catch(() => {});
        } else {
          await interaction.editReply({ content: null, embeds: [contentOrEmbed] }).catch(() => {});
        }
      });
    }
  },

  async prefixExecute(message, args, client) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id) ||
      message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      message.member.permissions.has(PermissionsBitField.Flags.ManageRoles);

    if (!isBypass) {
      return message.reply('❌ You do not have permission to run this command.');
    }

    if (args.length === 0) {
      return message.reply(
        '📌 **TNM Purge Command Usage:**\n' +
        '• `.purge @role` — Strip a specific role from all members in the server.\n' +
        '• `.purge <amount>` — Clear a number of messages in the channel (e.g. `.purge 50`).\n' +
        '• `.purge all` — Clear all messages in this channel.'
      );
    }

    const firstArg = args[0];

    // Detect if clearing messages
    const isNumber = !isNaN(firstArg);
    const isAll = ['all', 'everything', 'clear'].includes(firstArg.toLowerCase());

    if (isNumber || isAll) {
      // Forward to message clearing logic
      let targetChannel = message.channel;
      let amount = isNumber ? parseInt(firstArg, 10) : null;
      let clearAll = isAll;

      if (args[1]) {
        let fetchedChannel = message.mentions.channels.first();
        if (!fetchedChannel && /^\d+$/.test(args[1])) {
          fetchedChannel = await client.channels.fetch(args[1]).catch(() => null);
        }
        if (fetchedChannel) {
          targetChannel = fetchedChannel;
          if (args[2]?.toLowerCase() === 'all') clearAll = true;
          else if (!isNaN(args[2])) amount = parseInt(args[2], 10);
        }
      }

      const statusMsg = await message.channel.send(`🧹 Deleting messages in <#${targetChannel.id}>...`);

      try {
        if (clearAll || !amount) {
          const res = await purgeAllChannelMessages(targetChannel);
          await statusMsg.edit(`✅ Successfully deleted **${res.deleted}** message(s) from <#${targetChannel.id}>.`);
        } else {
          const deleted = await targetChannel.bulkDelete(amount, true);
          await statusMsg.edit(`🗑️ Deleted **${deleted.size}** message(s).`);
        }
      } catch (err) {
        console.error('[PREFIX CLEAR ERROR]', err);
        statusMsg.edit(`❌ Error deleting messages: \`${err.message}\``).catch(() => {});
      }
      return;
    }

    // Role Purging
    let role = message.mentions.roles.first();
    if (!role) {
      const roleIdOrName = args.join(' ');
      role = message.guild.roles.cache.get(roleIdOrName) ||
        message.guild.roles.cache.find(r => r.name.toLowerCase() === roleIdOrName.toLowerCase()) ||
        message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleIdOrName.toLowerCase()));
    }

    if (!role) {
      return message.reply('❌ **Could not find that role.** Please mention the role or provide a valid name/ID.');
    }

    const statusMsg = await message.channel.send(`🔍 **Scanning server roster for members with role <@&${role.id}>...**`);

    return handleRolePurge(message.guild, role, message.author, async (contentOrEmbed, isFinal = false) => {
      if (typeof contentOrEmbed === 'string') {
        await statusMsg.edit({ content: contentOrEmbed }).catch(() => {});
      } else {
        await statusMsg.edit({ content: null, embeds: [contentOrEmbed] }).catch(() => {
          message.channel.send({ embeds: [contentOrEmbed] });
        });
      }
    });
  }
};

async function handleRolePurge(guild, role, executor, progressCallback) {
  try {
    await progressCallback('🔄 **Fetching server member roster (this might take a moment)...**');
    const allMembers = await guild.members.fetch({ force: true }).catch(() => guild.members.cache);

    const membersToClean = Array.from(allMembers.values()).filter(m => m.roles.cache.has(role.id));
    const totalToClean = membersToClean.length;

    if (totalToClean === 0) {
      const cleanEmbed = new EmbedBuilder()
        .setColor(0x00D632)
        .setTitle('✅ Role Already Clean!')
        .setDescription(`Checked all members in **${guild.name}**. Zero members currently have the <@&${role.id}> role!`)
        .setTimestamp();
      return progressCallback(cleanEmbed, true);
    }

    await progressCallback(`🧹 **Found ${totalToClean} member(s) with role <@&${role.id}>.** Starting removal...`);

    let removedCount = 0;
    let failedCount = 0;
    let lastProgressUpdate = Date.now();

    for (let i = 0; i < totalToClean; i++) {
      const targetMember = membersToClean[i];
      try {
        await targetMember.roles.remove(role.id, `Role purge command run by ${executor.tag}`);
        removedCount++;
      } catch (err) {
        failedCount++;
      }

      // Live progress updates
      if (Date.now() - lastProgressUpdate > 2500 || i === totalToClean - 1) {
        lastProgressUpdate = Date.now();
        await progressCallback(
          `⏳ **Purging role in progress...**\n` +
          `• Stripped from: **${removedCount} / ${totalToClean}** members\n` +
          `• Progress: **${Math.round(((i + 1) / totalToClean) * 100)}%**`
        );
      }

      // Rate limit protection
      if (i % 15 === 0 && i > 0) {
        await new Promise(res => setTimeout(res, 200));
      }
    }

    const logoPath = path.join(__dirname, '../public/logo.png');
    const hasLocalLogo = fs.existsSync(logoPath);
    const files = hasLocalLogo ? [new AttachmentBuilder(logoPath, { name: 'logo.png' })] : [];

    const finalEmbed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('🧹 ROLE PURGE COMPLETE')
      .setDescription(
        `Successfully stripped the role from all members in **${guild.name}**!\n\n` +
        `• **Purged Role:** <@&${role.id}> (\`${role.id}\`)\n` +
        `• **Successfully Stripped:** **${removedCount}** member(s)\n` +
        (failedCount > 0 ? `• **Failed (Role Hierarchy):** \`${failedCount}\` member(s)\n` : '') +
        `• **Status:** Everyone with this role has had it completely removed!\n\n` +
        `👮 **Executed By:** <@${executor.id}>`
      )
      .setFooter({ 
        text: 'TNM Role Management • Purge System', 
        iconURL: hasLocalLogo ? 'attachment://logo.png' : 'https://shoptnm.org/favicon.png' 
      })
      .setTimestamp();

    return progressCallback(finalEmbed, true);
  } catch (err) {
    console.error('[Role Purge Error]:', err);
    const errorEmbed = new EmbedBuilder()
      .setColor(0xEF4444)
      .setTitle('❌ Purge Failed')
      .setDescription(`An unexpected error occurred during purge: \`${err.message}\``);
    return progressCallback(errorEmbed, true);
  }
}
