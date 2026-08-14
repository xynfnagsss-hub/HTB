const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { autoRankMemberFromDiscordRoles, getLinkedRobloxUser } = require('../utils/robloxManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('syncrank')
    .setDescription('Sync your Discord roles with your Roblox group rank')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('Target member (Admin only)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const target = interaction.options.getUser('target') || interaction.user;
    const member = await interaction.guild.members.fetch(target.id);

    try {
      const linked = await getLinkedRobloxUser(target.id);
      if (!linked) {
        return interaction.editReply({ content: `⚠️ <@${target.id}> is not verified with a Roblox account. Run \`/verify <username>\` first!` });
      }

      const res = await autoRankMemberFromDiscordRoles(member);
      if (res && res.success) {
        await interaction.editReply({ content: `🎉 Successfully synced <@${target.id}>'s rank to **${res.rank}** in the Roblox group!` });
      } else {
        await interaction.editReply({ content: `✅ <@${target.id}>'s Roblox rank is already up to date with their Discord roles.` });
      }
    } catch (err) {
      await interaction.editReply({ content: `❌ Sync error: \`${err.message}\`` });
    }
  },

  async prefixExecute(message, args) {
    const target = message.mentions.users.first() || message.author;
    const member = await message.guild.members.fetch(target.id);

    try {
      const linked = await getLinkedRobloxUser(target.id);
      if (!linked) {
        return message.reply(`⚠️ <@${target.id}> is not verified with a Roblox account. Run \`.verify <username>\` first!`);
      }

      const res = await autoRankMemberFromDiscordRoles(member);
      if (res && res.success) {
        await message.reply(`🎉 Successfully synced <@${target.id}>'s rank to **${res.rank}** in the Roblox group!`);
      } else {
        await message.reply(`✅ <@${target.id}>'s Roblox rank is already up to date with their Discord roles.`);
      }
    } catch (err) {
      await message.reply(`❌ Sync error: \`${err.message}\``);
    }
  }
};
