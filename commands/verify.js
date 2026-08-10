const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { linkRobloxUser, autoRankMemberFromDiscordRoles, getLinkedRobloxUser } = require('../utils/robloxManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Link and verify your Roblox account with your Discord profile')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Your exact Roblox username')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const username = interaction.options.getString('username');

    try {
      const profile = await linkRobloxUser(interaction.user.id, username);
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
    if (!args[0]) {
      const existing = await getLinkedRobloxUser(message.author.id);
      if (existing) {
        return message.reply(`✅ You are currently linked to Roblox user **@${existing.robloxUsername}** (ID: \`${existing.robloxId}\`). To change, run \`.verify <new_username>\`.`);
      }
      return message.reply('⚠️ Please provide your Roblox username to verify. Example: `.verify YourRobloxUsername`');
    }

    try {
      const profile = await linkRobloxUser(message.author.id, args[0]);
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
  }
};

function buildMustJoinEmbed(profile, groupId) {
  const groupUrl = `https://www.roblox.com/groups/${groupId || '316559660'}`;

  return new EmbedBuilder()
    .setColor(0xED4245) // Red
    .setTitle('⚠️ Roblox Group Membership Required')
    .setThumbnail(profile ? profile.avatarUrl : null)
    .setDescription(`Hey **${profile ? profile.displayName : 'there'}**! You must be a member of the official **HTB | Hit The Block** Roblox Group before you can verify.\n\n👉 **[Click Here to Join HTB Roblox Group](${groupUrl})**\n\n*Once you click "Join Group" on Roblox, run \`.verify ${profile ? profile.username : ''}\` again to link and claim your group rank!*`)
    .addFields(
      { name: '🛡️ Target Group', value: `[HTB | Hit The Block](${groupUrl})`, inline: true },
      { name: '🆔 Group ID', value: `\`${groupId || '316559660'}\``, inline: true }
    )
    .setFooter({ text: 'HTB Roblox Verification • Join Group Required', iconURL: 'https://htbwshop.jo3.org/favicon.png' })
    .setTimestamp();
}

function buildVerifyEmbed(discordUser, robloxProfile, rankResult) {
  const embed = new EmbedBuilder()
    .setColor(0x57F287) // Green
    .setTitle('✅ Roblox Account Verified')
    .setThumbnail(robloxProfile.avatarUrl)
    .setDescription(`Successfully linked **<@${discordUser.id}>** to Roblox user **[${robloxProfile.displayName} (@${robloxProfile.username})](https://www.roblox.com/users/${robloxProfile.userId}/profile)**.`)
    .addFields(
      { name: '🆔 Roblox ID', value: `\`${robloxProfile.userId}\``, inline: true },
      { name: '🛡️ HTB Group Rank', value: `**${robloxProfile.groupRank}**`, inline: true },
      { name: '⚡ Auto-Rank Status', value: rankResult && rankResult.success ? `🎉 Promoted to **${rankResult.rank}**!` : 'Synced with Discord roles', inline: false }
    )
    .setFooter({ text: 'HTB Roblox Verification • Hit The Block', iconURL: 'https://htbwshop.jo3.org/favicon.png' })
    .setTimestamp();

  return embed;
}
