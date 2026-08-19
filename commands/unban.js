const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const path = require('path');
const fs = require('fs');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

function hasBanPermission(member, userId) {
  if (ADMIN_BYPASS_USERS.includes(userId || member?.id)) return true;
  return member?.permissions?.has(PermissionsBitField.Flags.BanMembers) || false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server, or clear the server ban list')
    .addStringOption(opt =>
      opt.setName('user').setDescription('The user ID to unban, or "all" to unban everyone').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the unban').setRequired(false)),

  async execute(interaction) {
    if (!hasBanPermission(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '❌ You do not have permission to unban members.', ephemeral: true });
    }

    const rawUser = interaction.options.getString('user') || '';
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (rawUser.toLowerCase() === 'all') {
      return promptMassUnbanConfirmation(interaction, interaction.user);
    }

    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: '❌ I do not have permission to unban members in this server.', ephemeral: true });
    }

    const userId = rawUser.replace(/[^0-9]/g, '');
    let targetUserId = userId;
    let ban = null;

    try {
      if (!targetUserId || targetUserId.length < 17 || targetUserId.length > 20) {
        // Fallback: Search ban list by username / tag / display name
        const bans = await interaction.guild.bans.fetch().catch(() => null);
        ban = bans?.find(b => 
          b.user.username.toLowerCase() === rawUser.toLowerCase() ||
          b.user.tag.toLowerCase() === rawUser.toLowerCase() ||
          b.user.displayName?.toLowerCase() === rawUser.toLowerCase()
        );

        if (!ban) {
          return interaction.reply({ content: `❌ Could not find a banned user matching **"${rawUser}"**. Please provide their exact User ID or username.`, ephemeral: true });
        }
        targetUserId = ban.user.id;
      } else {
        ban = await interaction.guild.bans.fetch(targetUserId).catch(() => null);
        if (!ban) {
          return interaction.reply({ content: '❌ That user is not currently banned in this server.', ephemeral: true });
        }
      }

      await interaction.guild.members.unban(targetUserId, `${reason} | Unbanned by ${interaction.user.tag}`);

      const userDisplay = ban.user ? `${ban.user.tag} (${targetUserId})` : targetUserId;

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Member Unbanned')
        .addFields(
          { name: 'User', value: userDisplay, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[UNBAN ERROR]', err);
      interaction.reply({ content: '❌ Failed to unban that user. Please verify my permissions and try again.', ephemeral: true });
    }
  },

  async prefixExecute(message, args, client) {
    if (!hasBanPermission(message.member, message.author.id)) {
      return message.reply('❌ You do not have permission to unban members.');
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply('❌ I do not have permission to unban members in this server.');
    }

    if (!args.length) {
      return message.reply('❌ Usage: `.unban <userId/username/all> [reason]`');
    }

    const rawUser = args[0];
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (rawUser.toLowerCase() === 'all') {
      return promptMassUnbanConfirmation(message, message.author);
    }

    const userId = rawUser.replace(/[^0-9]/g, '');
    let targetUserId = userId;
    let ban = null;

    try {
      if (!targetUserId || targetUserId.length < 17 || targetUserId.length > 20) {
        // Fallback: Search ban list by username / tag / display name
        const statusMsg = await message.reply(`🔍 **Searching ban list for matching user "${rawUser}"...**`);
        const bans = await message.guild.bans.fetch().catch(() => null);
        ban = bans?.find(b => 
          b.user.username.toLowerCase() === rawUser.toLowerCase() ||
          b.user.tag.toLowerCase() === rawUser.toLowerCase() ||
          b.user.displayName?.toLowerCase() === rawUser.toLowerCase()
        );

        if (!ban) {
          return statusMsg.edit(`❌ **Could not find a banned user matching "${rawUser}".** Please provide their exact User ID or username.`);
        }
        targetUserId = ban.user.id;
        await statusMsg.delete().catch(() => {});
      } else {
        ban = await message.guild.bans.fetch(targetUserId).catch(() => null);
        if (!ban) {
          return message.reply('❌ That user is not currently banned in this server.');
        }
      }

      await message.guild.members.unban(targetUserId, `${reason} | Unbanned by ${message.author.tag}`);

      const userDisplay = ban.user ? `${ban.user.tag} (${targetUserId})` : targetUserId;

      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Member Unbanned')
        .addFields(
          { name: 'User', value: userDisplay, inline: true },
          { name: 'Moderator', value: message.author.tag, inline: true },
          { name: 'Reason', value: reason },
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('[UNBAN ERROR]', err);
      message.reply('❌ Failed to unban that user. Please verify my permissions and try again.');
    }
  },
};

async function promptMassUnbanConfirmation(source, executor) {
  const guild = source.guild;
  const isSlash = typeof source.deferReply === 'function';

  try {
    const bans = await guild.bans.fetch().catch(() => null);
    if (!bans || bans.size === 0) {
      const emptyMsg = '❌ **There are no banned members in this server.**';
      return isSlash ? source.reply({ content: emptyMsg, ephemeral: true }) : source.reply(emptyMsg);
    }

    const total = bans.size;
    const confirmEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('⚠️ MASS UNBAN CONFIRMATION')
      .setDescription(
        `**You are about to unban EVERY banned user in ${guild.name}!**\n\n` +
        `• **Banned Users Scanned:** **${total}**\n` +
        `• **Action:** This will lift bans for all accounts on the server list.\n\n` +
        `*Click **"Yes, Unban All"** to proceed, or click **"Cancel"** to abort.*`
      )
      .setTimestamp();

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('unban_all_confirm')
        .setLabel('Yes, Unban All')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('unban_all_cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    const replyMsg = isSlash
      ? await source.reply({ embeds: [confirmEmbed], components: [confirmRow], fetchReply: true })
      : await source.reply({ embeds: [confirmEmbed], components: [confirmRow] });

    const collector = replyMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === executor.id,
      time: 25000,
      componentType: ComponentType.Button,
    });

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'unban_all_cancel') {
        const cancelEmbed = new EmbedBuilder()
          .setColor(0x72767D)
          .setTitle('❌ Mass Unban Cancelled')
          .setDescription('The mass unban process has been cancelled. No users were unbanned.');

        await interaction.update({ embeds: [cancelEmbed], components: [] });
        return collector.stop('cancelled');
      }

      if (interaction.customId === 'unban_all_confirm') {
        await interaction.update({ content: '⏳ **Initializing mass unban...**', embeds: [], components: [] });
        collector.stop('confirmed');

        return handleMassUnbanExecution(guild, bans, executor, async (progressContent, progressEmbed) => {
          if (progressEmbed) {
            await replyMsg.edit({ content: null, embeds: [progressEmbed] }).catch(() => {});
          } else {
            await replyMsg.edit({ content: progressContent }).catch(() => {});
          }
        });
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'time') {
        const timeoutEmbed = new EmbedBuilder()
          .setColor(0x72767D)
          .setTitle('⌛ Confirmation Timed Out')
          .setDescription('The mass unban request timed out. No changes were made.');

        await replyMsg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
      }
    });
  } catch (err) {
    console.error('[Mass Unban Prompt Error]:', err);
    const errMsg = `❌ Failed to initiate mass unban: \`${err.message}\``;
    return isSlash ? source.reply({ content: errMsg, ephemeral: true }) : source.reply(errMsg);
  }
}

async function handleMassUnbanExecution(guild, bans, executor, updateCallback) {
  const total = bans.size;
  let unbanned = 0;
  let failed = 0;
  let lastUpdate = Date.now();

  const banList = Array.from(bans.values());

  for (let i = 0; i < total; i++) {
    const ban = banList[i];
    try {
      await guild.members.unban(ban.user.id, `Mass unban executed by ${executor.tag}`);
      unbanned++;
    } catch {
      failed++;
    }

    // Update progress bar
    if (Date.now() - lastUpdate > 2500 || i === total - 1) {
      lastUpdate = Date.now();
      const percent = Math.round(((i + 1) / total) * 100);
      const filledBars = Math.round(percent / 10);
      const emptyBars = 10 - filledBars;
      const progressBar = '▰'.repeat(filledBars) + '▱'.repeat(emptyBars);

      await updateCallback(
        `⏳ **Mass unban in progress...**\n` +
        `${progressBar} \`${percent}%\`\n` +
        `• Unbanned: **${unbanned} / ${total}**\n` +
        `• Failures: **${failed}**`
      );
    }

    // Rate-limiting throttle
    if (i % 10 === 0 && i > 0) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  const finalEmbed = new EmbedBuilder()
    .setColor(0x00D632)
    .setTitle('✅ MASS UNBAN COMPLETE')
    .setDescription(
      `Successfully cleared the server ban list!\n\n` +
      `• **Total Bans Scanned:** **${total}**\n` +
      `• **Successfully Unbanned:** **${unbanned}**\n` +
      (failed > 0 ? `• **Failed:** \`${failed}\`\n` : '') +
      `• **Moderator:** <@${executor.id}>`
    )
    .setFooter({ text: 'TNM Security System', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
    .setTimestamp();

  return updateCallback(null, finalEmbed);
}
