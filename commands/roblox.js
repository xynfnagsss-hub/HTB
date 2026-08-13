const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getPlayerProfile } = require('../utils/robloxManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roblox')
    .setDescription('Look up a Roblox player profile, avatar, account age, and group rank')
    .addStringOption(option =>
      option.setName('user')
        .setDescription('Roblox username or User ID')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString('user');

    try {
      const profile = await getPlayerProfile(query);
      const embed = buildRobloxEmbed(profile);
      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Error looking up Roblox player: \`${err.message}\`` });
    }
  },

  async prefixExecute(message, args) {
    if (!args[0]) {
      return message.reply('⚠️ Please provide a Roblox username or User ID. Example: `.roblox Builderman`');
    }

    try {
      const profile = await getPlayerProfile(args[0]);
      const embed = buildRobloxEmbed(profile);
      await message.reply({ embeds: [embed] });
    } catch (err) {
      await message.reply(`❌ Error looking up Roblox player: \`${err.message}\``);
    }
  }
};

function buildRobloxEmbed(profile) {
  const joinDateFormatted = profile.joinDate ? new Date(profile.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';

  return new EmbedBuilder()
    .setColor(0xF5AF19) // Gold
    .setTitle(`Roblox Profile: ${profile.displayName} (@${profile.username})`)
    .setURL(`https://www.roblox.com/users/${profile.userId}/profile`)
    .setThumbnail(profile.avatarUrl)
    .setDescription(profile.description && profile.description.length > 250 ? profile.description.slice(0, 250) + '...' : profile.description)
    .addFields(
      { name: '🆔 User ID', value: `\`${profile.userId}\``, inline: true },
      { name: '📅 Join Date', value: `${joinDateFormatted} (${profile.age || 0} days ago)`, inline: true },
      { name: '🛡️ HTB Group Rank', value: `**${profile.groupRank}** ${profile.groupRankId ? `(\`Rank ${profile.groupRankId}\`)` : ''}`, inline: false },
      { name: '🔗 Profile Link', value: `[View on Roblox](https://www.roblox.com/users/${profile.userId}/profile)`, inline: true },
      { name: '⛔ Account Status', value: profile.isBanned ? '🚨 Banned' : '✅ Active', inline: true }
    )
    .setFooter({ text: 'HTB Roblox System • 17k+ Community', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
    .setTimestamp();
}
