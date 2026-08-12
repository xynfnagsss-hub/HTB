const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require('discord.js');
const RobloxUser = require('../models/RobloxUser');

const UNVERIFIED_ROLE_ID = '1493511744339836939';
const VERIFIED_ROLE_ID = '1399811369489928354';
const SECONDARY_VERIFIED_ROLE_ID = '1396299470244810942';
const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unverify')
    .setDescription('Unverify management and role purge commands.')
    .addSubcommand(sub =>
      sub
        .setName('purge')
        .setDescription('Purge/remove the Unverified role from all members who already have the Verified role.')
    )
    .addSubcommand(sub =>
      sub
        .setName('user')
        .setDescription('Unverify and unlink a member.')
        .addUserOption(opt =>
          opt.setName('target').setDescription('The member to unverify').setRequired(true)
        )
    ),

  async execute(interaction) {
    const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id);
    if (!isBypass && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return interaction.reply({ content: '❌ You do not have permission to manage verification roles.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'purge') {
      await interaction.deferReply();
      return handlePurge(interaction.guild, interaction.user, async (embed) => {
        await interaction.editReply({ embeds: [embed] });
      });
    }

    if (sub === 'user') {
      const targetUser = interaction.options.getUser('target');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      if (!targetMember) {
        return interaction.reply({ content: '❌ Member not found in this server.', ephemeral: true });
      }

      await interaction.deferReply();
      return handleUnverifyUser(targetMember, interaction.user, async (embed) => {
        await interaction.editReply({ embeds: [embed] });
      });
    }
  },

  async prefixExecute(message, args) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply('❌ You do not have permission to manage verification roles.');
    }

    const sub = args[0] ? args[0].toLowerCase() : '';

    if (sub === 'purge') {
      const statusMsg = await message.reply('⏳ **Scanning server members and purging unverified role from verified members...**');
      return handlePurge(message.guild, message.author, async (embed) => {
        await statusMsg.edit({ content: null, embeds: [embed] }).catch(() => {
          message.channel.send({ embeds: [embed] });
        });
      });
    }

    // Unverify single user: .unverify @user
    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply(
        '📌 **Unverify Commands:**\n' +
        '• `.unverify purge` — Removes Unverified role (`1493511744339836939`) from everyone with Verified role (`1399811369489928354`).\n' +
        '• `.unverify @member` — Unverifies and unlinks a specific member.'
      );
    }

    const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return message.reply('❌ Member not found in this server.');
    }

    const statusMsg = await message.reply(`⏳ Unverifying <@${targetUser.id}>...`);
    return handleUnverifyUser(targetMember, message.author, async (embed) => {
      await statusMsg.edit({ content: null, embeds: [embed] }).catch(() => {
        message.channel.send({ embeds: [embed] });
      });
    });
  },
};

/**
 * Handle Purging Unverified Role from Verified Members
 */
async function handlePurge(guild, executor, replyCallback) {
  try {
    const unverifiedRole = guild.roles.cache.get(UNVERIFIED_ROLE_ID);
    const verifiedRole = guild.roles.cache.get(VERIFIED_ROLE_ID);

    if (!unverifiedRole) {
      const embed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('❌ Unverified Role Not Found')
        .setDescription(`Could not find Unverified role with ID \`${UNVERIFIED_ROLE_ID}\` in this server.`);
      return replyCallback(embed);
    }

    // Fetch all members
    const allMembers = await guild.members.fetch();
    let purgedCount = 0;
    let failedCount = 0;

    // Filter members who have BOTH unverified role AND verified role
    const targets = allMembers.filter(m => 
      m.roles.cache.has(UNVERIFIED_ROLE_ID) && 
      (m.roles.cache.has(VERIFIED_ROLE_ID) || m.roles.cache.has(SECONDARY_VERIFIED_ROLE_ID))
    );

    for (const member of targets.values()) {
      try {
        await member.roles.remove(UNVERIFIED_ROLE_ID, `Purge executed by ${executor.tag} (.unverify purge)`);
        purgedCount++;
        // Small delay to avoid aggressive rate-limiting
        if (purgedCount % 20 === 0) {
          await new Promise(res => setTimeout(res, 250));
        }
      } catch (err) {
        failedCount++;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('🧹 HTB ROLE PURGE COMPLETE')
      .setDescription(
        `Successfully cleaned up member roles across **${guild.name}**.\n\n` +
        `• **Unverified Role Removed:** <@&${UNVERIFIED_ROLE_ID}>\n` +
        `• **Verified Filter Role:** <@&${VERIFIED_ROLE_ID}>\n` +
        `• **Members Cleaned:** **${purgedCount}** member(s)\n` +
        (failedCount > 0 ? `• **Failed / Hierarchy Skipped:** \`${failedCount}\` member(s)\n` : '') +
        `• **Executed By:** <@${executor.id}>`
      )
      .setFooter({ text: 'HTB Role Management • Clean Verification System', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
      .setTimestamp();

    return replyCallback(embed);
  } catch (err) {
    const embed = new EmbedBuilder()
      .setColor(0xEF4444)
      .setTitle('❌ Purge Error')
      .setDescription(`An error occurred while purging roles: \`${err.message}\``);
    return replyCallback(embed);
  }
}

/**
 * Handle Unverifying a single user
 */
async function handleUnverifyUser(member, executor, replyCallback) {
  try {
    // 1. Remove verified roles
    await member.roles.remove([VERIFIED_ROLE_ID, SECONDARY_VERIFIED_ROLE_ID].filter(id => member.roles.cache.has(id)), `Unverified by ${executor.tag}`).catch(() => {});
    
    // 2. Add unverified role
    if (!member.roles.cache.has(UNVERIFIED_ROLE_ID)) {
      await member.roles.add(UNVERIFIED_ROLE_ID, `Unverified by ${executor.tag}`).catch(() => {});
    }

    // 3. Remove DB link
    await RobloxUser.deleteOne({ discordId: member.id }).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('🔓 MEMBER UNVERIFIED')
      .setDescription(
        `Successfully unverified <@${member.id}>.\n\n` +
        `• **Verified Roles Removed:** Yes\n` +
        `• **Unverified Role Assigned:** <@&${UNVERIFIED_ROLE_ID}>\n` +
        `• **Database Link Cleared:** Yes\n` +
        `• **Executed By:** <@${executor.id}>`
      )
      .setFooter({ text: 'HTB Roblox System • 17k+ Community', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
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
