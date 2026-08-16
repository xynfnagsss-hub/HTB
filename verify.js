const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
} = require('discord.js');
const { linkRobloxUser, autoRankMemberFromDiscordRoles, getLinkedRobloxUser } = require('../utils/robloxManager');

const VERIFIED_ROLE_IDS = ['1396299470244810942', '1399811369489928354'];
const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];
const UNVERIFIED_ROLE_ID = '1493511744339836939';

async function grantVerifiedRoles(member) {
  if (!member || !member.guild) return;
  const guild = member.guild;

  // 1. Universal Verified Roles Grant (Find by ID or by Name)
  const verifiedRolesToGrant = guild.roles.cache.filter(r => 
    VERIFIED_ROLE_IDS.includes(r.id) ||
    r.name.toLowerCase() === 'verified' ||
    r.name.toLowerCase() === 'tnm verified' ||
    r.name.toLowerCase() === 'tnm fam' ||
    r.name.toLowerCase() === 'member'
  );

  for (const role of verifiedRolesToGrant.values()) {
    try {
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role.id, 'TNM Roblox Verification Complete');
      }
    } catch (e) {
      console.warn(`[Role Grant Warning ${role.name} (${role.id})]:`, e.message);
    }
  }

  // 2. Universal Unverified Role Removal (Find by ID or by Name)
  const unverifiedRolesToRemove = guild.roles.cache.filter(r => 
    r.id === UNVERIFIED_ROLE_ID ||
    r.name.toLowerCase() === 'unverified' ||
    r.name.toLowerCase() === 'not verified' ||
    r.name.toLowerCase() === 'pending verification'
  );

  for (const role of unverifiedRolesToRemove.values()) {
    try {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role.id, 'Verified - Removing Unverified Role');
      }
    } catch (e) {
      console.warn(`[Unverified Role Removal Warning ${role.name}]:`, e.message);
    }
  }
}

function buildVerificationPanelEmbed() {
  return new EmbedBuilder()
    .setColor(0xF5AF19)
    .setTitle('🛡️ TRUST NO MOB • ROBLOX VERIFICATION GATEWAY')
    .setDescription(
      `Welcome to **Trust No Mob (TNM)**! To unlock all server channels, community chat, voice rooms, and access passes, you must link your Roblox account.\n\n` +
      `📌 **VERIFICATION STEPS:**\n` +
      `**1.** Click **"1. Join Roblox Group"** below to join the official **TNM | Trust No Mob** Roblox Group.\n` +
      `**2.** Click **"2. Verify Account"** and enter your exact Roblox username in the popup modal.\n` +
      `**3.** Once confirmed, the bot grants you your **Verified Roles** and full server access immediately!\n\n` +
      `⚠️ *Note: You MUST be a member of the Roblox Group or verification will be rejected.*`
    )
    .addFields(
      { name: '🛡️ Official Roblox Group', value: `[TNM | Trust No Mob (316559660)](https://www.roblox.com/groups/316559660)`, inline: false }
    )
    .setImage('https://xynfnagsss-hub.github.io/tnmwshop/logo.png')
    .setFooter({ text: 'TNM Roblox Gateway • Group ID: 316559660', iconURL: 'https://xynfnagsss-hub.github.io/tnmwshop/favicon.png' });
}

function buildVerificationPanelButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('1. Join Roblox Group')
      .setURL('https://www.roblox.com/groups/316559660')
      .setStyle(ButtonStyle.Link)
      .setEmoji('🔗'),
    new ButtonBuilder()
      .setCustomId('tnm_verify_btn')
      .setLabel('2. Verify Account')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅')
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Link and verify your Roblox account with your Discord profile')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Your exact Roblox username (or type "setup" for Admin panel)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('Target channel for the verification panel (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const input = (interaction.options.getString('username') || '').trim();

    // 1. Setup Panel command
    if (input.toLowerCase() === 'setup') {
      const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id);
      if (!isBypass && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: '❌ Only administrators can set up the verification panel.', ephemeral: true });
      }

      const targetChannel = interaction.options.getChannel('channel') || 
        interaction.guild.channels.cache.find(c => ['verify', 'verification', 'verify-here', 'get-verified'].includes(c.name.toLowerCase())) ||
        interaction.channel;

      const panelEmbed = buildVerificationPanelEmbed();
      const panelRow = buildVerificationPanelButtons();
      await targetChannel.send({ embeds: [panelEmbed], components: [panelRow] });
      return interaction.reply({ content: `✅ Verification panel successfully deployed to <#${targetChannel.id}>!`, ephemeral: true });
    }

    if (!input) {
      return interaction.reply({
        content: '⚠️ Please provide your Roblox username or click the **Verify Account** button in the verification channel. Example: `/verify username:YourRobloxUsername`',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const profile = await linkRobloxUser(interaction.user.id, input);
      await grantVerifiedRoles(interaction.member);
      const rankResult = await autoRankMemberFromDiscordRoles(interaction.member);

      const embed = buildVerifyEmbed(interaction.user, profile, rankResult);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      if (err.mustJoinGroup) {
        const groupEmbed = buildMustJoinEmbed(err.profile, err.groupId);
        return await interaction.editReply({ embeds: [groupEmbed] });
      }
      await interaction.editReply({ content: `❌ Verification failed: \`${err.message}\`` });
    }
  },

  async prefixExecute(message, args) {
    const firstArg = args[0] ? args[0].toLowerCase() : '';

    // 1. Setup Panel command: .verify setup [#channel/channel_name]
    if (firstArg === 'setup') {
      const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
      if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ Only administrators can set up the verification panel.');
      }

      // Universal Channel Detection: Look for mention, channel name argument, or auto-detect by name
      let targetChannel = message.mentions.channels.first();
      if (!targetChannel && args[1]) {
        const query = args[1].toLowerCase().replace(/^#/, '');
        targetChannel = message.guild.channels.cache.find(c => 
          c.id === query || 
          c.name.toLowerCase() === query || 
          c.name.toLowerCase().includes(query)
        );
      }

      if (!targetChannel) {
        targetChannel = message.guild.channels.cache.find(c => 
          ['verify', 'verification', 'verify-here', 'get-verified', 'link-account'].includes(c.name.toLowerCase())
        ) || message.channel;
      }

      const panelEmbed = buildVerificationPanelEmbed();
      const panelRow = buildVerificationPanelButtons();
      await targetChannel.send({ embeds: [panelEmbed], components: [panelRow] });
      
      if (targetChannel.id !== message.channel.id) {
        await message.reply(`✅ Verification panel successfully deployed in <#${targetChannel.id}>!`);
      }
      if (message.deletable) message.delete().catch(() => {});
      return;
    }

    if (!args[0]) {
      const existing = await getLinkedRobloxUser(message.author.id);
      if (existing) {
        return message.reply(`✅ You are linked to Roblox user **@${existing.robloxUsername}** (ID: \`${existing.robloxId}\`). To re-verify, run \`.verify <new_username>\`.`);
      }
      return message.reply('⚠️ Please provide your Roblox username to verify. Example: `.verify YourRobloxUsername`');
    }

    try {
      const profile = await linkRobloxUser(message.author.id, args[0]);
      await grantVerifiedRoles(message.member);
      const rankResult = await autoRankMemberFromDiscordRoles(message.member);

      const embed = buildVerifyEmbed(message.author, profile, rankResult);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      if (err.mustJoinGroup) {
        const groupEmbed = buildMustJoinEmbed(err.profile, err.groupId);
        return await message.reply({ embeds: [groupEmbed] });
      }
      await message.reply(`❌ Verification failed: \`${err.message}\``);
    }
  },

  grantVerifiedRoles,
  buildMustJoinEmbed,
  buildVerifyEmbed,
  buildVerificationPanelEmbed,
  buildVerificationPanelButtons,
};

function buildMustJoinEmbed(profile, groupId) {
  const groupUrl = `https://www.roblox.com/groups/${groupId || '316559660'}`;

  return new EmbedBuilder()
    .setColor(0xED4245) // Red
    .setTitle('⚠️ Roblox Group Membership Required')
    .setThumbnail(profile ? profile.avatarUrl : null)
    .setDescription(
      `Hey **${profile ? profile.displayName : 'there'}**! You must be a member of the official **TNM | Trust No Mob** Roblox Group before you can verify.\n\n` +
      `👉 **[Click Here to Join TNM Roblox Group](${groupUrl})**\n\n` +
      `*Once you click "Join Group" on Roblox, click the **Verify Account** button again (or run \`.verify ${profile ? profile.username : ''}\`) to unlock the server and claim your ranks!*`
    )
    .addFields(
      { name: '🛡️ Target Group', value: `[TNM | Trust No Mob](${groupUrl})`, inline: true },
      { name: '🆔 Group ID', value: `\`${groupId || '316559660'}\``, inline: true }
    )
    .setFooter({ text: 'TNM Roblox Verification • Group Join Required', iconURL: 'https://xynfnagsss-hub.github.io/tnmwshop/favicon.png' })
    .setTimestamp();
}

function buildVerifyEmbed(discordUser, robloxProfile, rankResult) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287) // Green
    .setTitle('✅ Roblox Account Verified & Roles Assigned')
    .setThumbnail(robloxProfile.avatarUrl)
    .setDescription(
      `Successfully linked **<@${discordUser.id}>** to Roblox user **[${robloxProfile.displayName} (@${robloxProfile.username})](https://www.roblox.com/users/${robloxProfile.userId}/profile)**.\n\n` +
      `🔓 **Server Unlocked:** Verified roles (<@&1396299470244810942>, <@&1399811369489928354>) have been granted!`
    )
    .addFields(
      { name: '🆔 Roblox ID', value: `\`${robloxProfile.userId}\``, inline: true },
      { name: '🛡️ TNM Group Rank', value: `**${robloxProfile.groupRank}**`, inline: true },
      { name: '⚡ Auto-Rank Status', value: rankResult && rankResult.success ? `🎉 Synced to **${rankResult.rank}**!` : 'Synced with Discord roles', inline: false }
    )
    .setFooter({ text: 'TNM Roblox Verification • Trust No Mob', iconURL: 'https://xynfnagsss-hub.github.io/tnmwshop/favicon.png' })
    .setTimestamp();

  return embed;
}
