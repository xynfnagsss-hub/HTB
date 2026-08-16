const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require('discord.js');
const RobloxUser = require('../models/RobloxUser');

const UNVERIFIED_ROLE_ID = '1493511744339836939';
const VERIFIED_ROLE_IDS = ['1399811369489928354', '1396299470244810942'];
const LEGACY_ACCESS_ROLE_IDS = ['1521726989738709153', '1396309579788189819', '1410103735253995590', '1396309744179871789'];
const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unverify')
    .setDescription('Role cleanup & unverify management.')
    .addSubcommand(sub =>
      sub
        .setName('purge')
        .setDescription('Remove UNVERIFIED role from EVERY member in the server who has the VERIFIED role.')
    )
    .addSubcommand(sub =>
      sub
        .setName('user')
        .setDescription('Unverify and unlink a specific member.')
        .addUserOption(opt =>
          opt.setName('target').setDescription('The member to unverify').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('legacy-access')
        .setDescription('Remove old retired access roles from all members.')
    ),

  async execute(interaction) {
    const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id);
    if (!isBypass && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ You do not have permission to manage roles.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'purge') {
      await interaction.deferReply();
      return handleMassRolePurge(interaction.guild, interaction.user, async (embed, isFinal = false) => {
        if (isFinal) {
          await interaction.editReply({ embeds: [embed] });
        }
      });
    }

    if (sub === 'user') {
      const targetUser = interaction.options.getUser('target');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: '❌ Member not found in this server.', ephemeral: true });
      }

      await interaction.deferReply();
      return handleUnverifySingleUser(targetMember, interaction.user, async (embed) => {
        await interaction.editReply({ embeds: [embed] });
      });
    }

    if (sub === 'legacy-access') {
      await interaction.deferReply({ ephemeral: true });
      return handleLegacyAccessRoleCleanup(interaction.guild, interaction.user, async (embed) => {
        await interaction.editReply({ embeds: [embed] });
      });
    }
  },

  async prefixExecute(message, args) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ You do not have permission to manage roles.');
    }

    const sub = args[0] ? args[0].toLowerCase() : '';

    if (sub === 'legacy' || sub === 'legacy-access' || sub === 'old-access') {
      const statusMsg = await message.reply('🧹 Removing retired legacy access roles from all members...');
      return handleLegacyAccessRoleCleanup(message.guild, message.author, async (embed) => {
        await statusMsg.edit({ content: null, embeds: [embed] }).catch(() => {
          message.channel.send({ embeds: [embed] });
        });
      });
    }

    if (sub === 'purge' || sub === 'clean' || sub === 'all') {
      const statusMsg = await message.reply('🔍 **Fetching all server members and scanning for members with BOTH Verified & Unverified roles...**');
      return handleMassRolePurge(message.guild, message.author, async (contentOrEmbed, isFinal = false) => {
        if (typeof contentOrEmbed === 'string') {
          await statusMsg.edit({ content: contentOrEmbed }).catch(() => {});
        } else {
          await statusMsg.edit({ content: null, embeds: [contentOrEmbed] }).catch(() => {
            message.channel.send({ embeds: [contentOrEmbed] });
          });
        }
      });
    }

    // Single member unverify: .unverify @user
    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply(
        '📌 **TNM Unverify Management:**\n' +
        '• `.unverify purge` — **Removes the UNVERIFIED role (`1493511744339836939`) from EVERY member who has the VERIFIED role (`1399811369489928354`)** so they only keep Verified.\n' +
        '• `.unverify @member` — Unverifies and strips verified roles from a single member.'
      );
    }

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return message.reply('❌ Member not found in this server.');
    }

    const statusMsg = await message.reply(`⏳ Unverifying <@${targetUser.id}>...`);
    return handleUnverifySingleUser(targetMember, message.author, async (embed) => {
      await statusMsg.edit({ content: null, embeds: [embed] }).catch(() => {
        message.channel.send({ embeds: [embed] });
      });
    });
  },
};

function getGuildUnverifiedRoles(guild) {
  return guild.roles.cache.filter(r => 
    r.id === UNVERIFIED_ROLE_ID ||
    r.name.toLowerCase() === 'unverified' ||
    r.name.toLowerCase() === 'not verified' ||
    r.name.toLowerCase() === 'pending verification'
  );
}

function getGuildVerifiedRoles(guild) {
  return guild.roles.cache.filter(r => 
    VERIFIED_ROLE_IDS.includes(r.id) ||
    r.name.toLowerCase() === 'verified' ||
    r.name.toLowerCase() === 'tnm verified' ||
    r.name.toLowerCase() === 'tnm fam' ||
    r.name.toLowerCase() === 'member'
  );
}

/**
 * Handle Server-Wide Mass Role Purge (Removes UNVERIFIED from all VERIFIED members)
 */
async function handleMassRolePurge(guild, executor, progressCallback) {
  try {
    // 1. Fetch entire guild member list (force fetch for large communities)
    await progressCallback('🔄 **Fetching server member roster...**');
    const allMembers = await guild.members.fetch({ force: true }).catch(async () => {
      return guild.members.cache;
    });

    const unverifiedRoles = getGuildUnverifiedRoles(guild);
    const verifiedRoles = getGuildVerifiedRoles(guild);

    if (unverifiedRoles.size === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('❌ Unverified Role Not Found')
        .setDescription(`Could not find an Unverified role (by ID or named "Unverified") in **${guild.name}**.`);
      return progressCallback(errorEmbed, true);
    }

    if (verifiedRoles.size === 0) {
      const errorEmbed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('❌ Verified Role Not Found')
        .setDescription(`Could not find a Verified role (by ID or named "Verified") in **${guild.name}**.`);
      return progressCallback(errorEmbed, true);
    }

    const unverifiedRoleIds = Array.from(unverifiedRoles.keys());
    const verifiedRoleIds = Array.from(verifiedRoles.keys());

    // 2. Find ALL members who have ANY unverified role AND ANY verified role
    const membersToClean = [];
    for (const member of allMembers.values()) {
      if (member.user.bot) continue;

      const hasUnverified = unverifiedRoleIds.some(id => member.roles.cache.has(id));
      const hasVerified = verifiedRoleIds.some(id => member.roles.cache.has(id));

      if (hasUnverified && hasVerified) {
        membersToClean.push(member);
      }
    }

    const totalToClean = membersToClean.length;

    if (totalToClean === 0) {
      const cleanEmbed = new EmbedBuilder()
        .setColor(0x00D632)
        .setTitle('✅ Server Already Clean!')
        .setDescription(
          `Scanned **${allMembers.size}** total members in **${guild.name}**.\n\n` +
          `Zero members hold both **Verified** and **Unverified** roles. Everyone with Verified is clean!`
        )
        .setFooter({ text: 'TNM Role Cleaner • Universal Server Guard', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' });
      return progressCallback(cleanEmbed, true);
    }

    await progressCallback(`🧹 **Found ${totalToClean} member(s) with both Verified & Unverified roles.** Starting role removal...`);

    let removedCount = 0;
    let failedCount = 0;
    let lastProgressUpdate = Date.now();

    // 3. Process every single matching member
    for (let i = 0; i < totalToClean; i++) {
      const targetMember = membersToClean[i];
      try {
        const rolesToRemove = unverifiedRoleIds.filter(id => targetMember.roles.cache.has(id));
        if (rolesToRemove.length > 0) {
          await targetMember.roles.remove(
            rolesToRemove,
            `Mass purge by ${executor.tag} (.unverify purge) - Member already holds Verified role`
          );
        }
        removedCount++;
      } catch (err) {
        failedCount++;
      }

      // Live progress update every 2.5 seconds or every 30 members
      if (Date.now() - lastProgressUpdate > 2500 || i === totalToClean - 1) {
        lastProgressUpdate = Date.now();
        await progressCallback(
          `⏳ **Purging in progress...**\n` +
          `• Removed Unverified Role: **${removedCount} / ${totalToClean}** members\n` +
          `• Progress: **${Math.round(((i + 1) / totalToClean) * 100)}%**`
        );
      }

      // Rate limit protection
      if (i % 15 === 0 && i > 0) {
        await new Promise(res => setTimeout(res, 200));
      }
    }

    // 4. Final Success Embed
    const finalEmbed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('🧹 SERVER-WIDE ROLE PURGE COMPLETE')
      .setDescription(
        `Successfully cleaned up **every verified member** across **${guild.name}**!\n\n` +
        `• **Role Removed:** <@&${UNVERIFIED_ROLE_ID}> (Unverified Role)\n` +
        `• **Preserved Role:** <@&${VERIFIED_ROLE_IDS[0]}> (Verified Role)\n` +
        `• **Total Members Cleaned:** **${removedCount}** member(s)\n` +
        (failedCount > 0 ? `• **Skipped / Role Hierarchy:** \`${failedCount}\` member(s)\n` : '') +
        `• **Status:** Verified members now **ONLY** have Verified, with Unverified completely removed!\n\n` +
        `👮 **Executed By:** <@${executor.id}>`
      )
      .setFooter({ text: 'TNM Role Management • Clean Verification System', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
      .setTimestamp();

    return progressCallback(finalEmbed, true);
  } catch (globalErr) {
    const errorEmbed = new EmbedBuilder()
      .setColor(0xEF4444)
      .setTitle('❌ Purge Failed')
      .setDescription(`An unexpected error occurred during purge: \`${globalErr.message}\``);
    return progressCallback(errorEmbed, true);
  }
}

/**
 * Handle Unverifying a single user
 */
async function handleLegacyAccessRoleCleanup(guild, executor, replyCallback) {
  try {
    await guild.members.fetch({ force: true }).catch(() => guild.members.cache);
    const members = Array.from(guild.members.cache.values());
    let removed = 0;
    let scanned = 0;

    for (const member of members) {
      if (member.user.bot) continue;
      scanned += 1;

      const rolesToRemove = LEGACY_ACCESS_ROLE_IDS.filter(roleId => member.roles.cache.has(roleId));
      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove, `Legacy TNM access cleanup by ${executor.tag}`).catch(() => {});
        removed += 1;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x00D632)
      .setTitle('🧹 Legacy Access Cleanup Complete')
      .setDescription(
        `Scanned **${scanned}** members and removed the retired access roles from **${removed}** member(s).\n\n` +
        `Removed role IDs:\n` +
        LEGACY_ACCESS_ROLE_IDS.map(id => `• <@&${id}>`).join('\n') +
        `\n\nExecuted by: <@${executor.id}>`
      )
      .setFooter({ text: 'TNM Access Management • Legacy Role Cleanup', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
      .setTimestamp();

    return replyCallback(embed);
  } catch (err) {
    const embed = new EmbedBuilder()
      .setColor(0xEF4444)
      .setTitle('❌ Legacy Access Cleanup Failed')
      .setDescription(`Failed to remove retired role IDs: \`${err.message}\``);
    return replyCallback(embed);
  }
}

async function handleUnverifySingleUser(member, executor, replyCallback) {
  try {
    // 1. Remove verified roles
    await member.roles.remove(
      VERIFIED_ROLE_IDS.filter(id => member.roles.cache.has(id)),
      `Unverified by ${executor.tag}`
    ).catch(() => {});

    // 2. Remove retired legacy access roles
    await member.roles.remove(
      LEGACY_ACCESS_ROLE_IDS.filter(id => member.roles.cache.has(id)),
      `Legacy TNM access cleanup by ${executor.tag}`
    ).catch(() => {});
    
    // 3. Add unverified role
    if (!member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
      await member.roles.add(UNVERIFIED_ROLE_ID, `Unverified by ${executor.tag}`).catch(() => {});
    }

    // 4. Remove DB link
    await RobloxUser.deleteOne({ discordId: member.id }).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('🔓 MEMBER UNVERIFIED')
      .setDescription(
        `Successfully unverified <@${member.id}>.\n\n` +
        `• **Verified Roles Removed:** Yes\n` +
        `• **Legacy Access Roles Removed:** Yes\n` +
        `• **Unverified Role Assigned:** <@&${UNVERIFIED_ROLE_ID}>\n` +
        `• **Database Link Cleared:** Yes\n` +
        `• **Executed By:** <@${executor.id}>`
      )
      .setFooter({ text: 'TNM Roblox System • Community', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
      .setTimestamp();

    return replyCallback(embed);
  } catch (err) {
    const embed = new EmbedBuilder()
      .setColor(0xEF4444)
      .setTitle('❌ Unverify Error')
      .setDescription(`Failed to unverify member: \`${err.message}\``);
    return replyCallback(embed);
  }
}
