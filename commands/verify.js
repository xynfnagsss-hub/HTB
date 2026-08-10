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
      await message.reply(`❌ Verification failed: \`${err.message}\``);
    }
  }
};

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
