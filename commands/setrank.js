const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { setPlayerRank, getPlayerProfile } = require('../utils/robloxManager');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setrank')
    .setDescription('Set or change a player\'s rank in the TNM Roblox Group')
    .addStringOption(option =>
      option.setName('user')
        .setDescription('Roblox username or User ID')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('rank')
        .setDescription('Target rank name or rank number (e.g. Moderator, Noted Member, 1-255)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

  async execute(interaction) {
    const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id);
    if (!isBypass && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: '❌ You do not have permission to manage Roblox group ranks.', ephemeral: true });
    }

    await interaction.deferReply();
    const targetUser = interaction.options.getString('user');
    const rank = interaction.options.getString('rank');

    try {
      const rankNum = /^\d+$/.test(rank) ? parseInt(rank) : rank;
      const res = await setPlayerRank(process.env.ROBLOX_GROUP_ID, targetUser, rankNum);
      const profile = await getPlayerProfile(res.targetId);

      const embed = new EmbedBuilder()
        .setColor(0xF5AF19)
        .setTitle('✅ Roblox Group Rank Updated')
        .setThumbnail(profile.avatarUrl)
        .setDescription(`Successfully updated **${profile.displayName} (@${profile.username})** in **TNM**.`)
        .addFields(
          { name: '👤 Player', value: `\`${profile.username}\` (ID: \`${profile.userId}\`)`, inline: false },
          { name: '📉 Previous Rank', value: `\`${res.previousRankName}\` (Rank \`${res.previousRankId}\`)`, inline: true },
          { name: '📈 New Assigned Rank', value: `🎉 **${res.newRankName}** (Rank \`${res.newRankId}\`)`, inline: true },
          { name: '👮 Updated By', value: `<@${interaction.user.id}>`, inline: false }
        )
        .setFooter({ text: 'TNM Group Management • 316559660', iconURL: 'https://shoptnm.org/favicon.png' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      await interaction.editReply({ content: `❌ Error setting rank: \`${err.message}\`` });
    }
  },

  async prefixExecute(message, args) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('❌ You do not have permission to manage Roblox group ranks.');
    }

    if (args.length < 2) {
      return message.reply('⚠️ Usage: `.setrank <roblox_username> <rank_name_or_id>`\nExample: `.setrank Player123 "TNM FAM"` or `.setrank Player123 3`');
    }

    const targetUser = args[0];
    const rankInput = args.slice(1).join(' ').replace(/["']/g, '');

    try {
      const rankNum = /^\d+$/.test(rankInput) ? parseInt(rankInput) : rankInput;
      const res = await setPlayerRank(process.env.ROBLOX_GROUP_ID, targetUser, rankNum);
      const profile = await getPlayerProfile(res.targetId);

      const embed = new EmbedBuilder()
        .setColor(0xF5AF19)
        .setTitle('✅ Roblox Group Rank Updated')
        .setThumbnail(profile.avatarUrl)
        .setDescription(`Successfully updated **${profile.displayName} (@${profile.username})** in **TNM**.`)
        .addFields(
          { name: '👤 Player', value: `\`${profile.username}\` (ID: \`${profile.userId}\`)`, inline: false },
          { name: '📉 Previous Rank', value: `\`${res.previousRankName}\` (Rank \`${res.previousRankId}\`)`, inline: true },
          { name: '📈 New Assigned Rank', value: `🎉 **${res.newRankName}** (Rank \`${res.newRankId}\`)`, inline: true },
          { name: '👮 Updated By', value: `<@${message.author.id}>`, inline: false }
        )
        .setFooter({ text: 'TNM Group Management • 316559660', iconURL: 'https://shoptnm.org/favicon.png' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      await message.reply(`❌ Error setting rank: \`${err.message}\``);
    }
  }
};
