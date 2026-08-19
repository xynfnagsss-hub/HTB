const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

function hasBanPermission(member, userId) {
  if (ADMIN_BYPASS_USERS.includes(userId || member?.id)) return true;
  return member?.permissions?.has(PermissionsBitField.Flags.BanMembers) || false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .addStringOption(opt =>
      opt.setName('user').setDescription('The user ID to unban (or mention)').setRequired(true))
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Reason for the unban').setRequired(false)),

  async execute(interaction) {
    if (!hasBanPermission(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '❌ You do not have permission to unban members.', ephemeral: true });
    }

    const rawUser = interaction.options.getString('user') || interaction.options.getString('userid') || '';
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (rawUser.toLowerCase() === 'all') {
      await interaction.deferReply();
      return handleMassUnban(interaction.guild, interaction.user, async (msgData) => {
        await interaction.editReply(msgData);
      });
    }

    const userId = rawUser.replace(/[^0-9]/g, '');

    // Validate ID length (Discord snowflakes are 17-20 digits)
    if (!userId || userId.length < 17 || userId.length > 20) {
      return interaction.reply({ content: '❌ Please provide a valid 17-20 digit user ID.', ephemeral: true });
    }

    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return interaction.reply({ content: '❌ I do not have permission to unban members in this server.', ephemeral: true });
    }

    try {
      // Fetch ban entry to verify the user is banned
      const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!ban) {
        return interaction.reply({ content: '❌ That user is not currently banned in this server.', ephemeral: true });
      }

      await interaction.guild.members.unban(userId, `${reason} | Unbanned by ${interaction.user.tag}`);

      const userDisplay = ban.user ? `${ban.user.tag} (${userId})` : userId;

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

  // Prefix command support (.unban <userId/all> [reason])
  async prefixExecute(message, args, client) {
    if (!hasBanPermission(message.member, message.author.id)) {
      return message.reply('❌ You do not have permission to unban members.');
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply('❌ I do not have permission to unban members in this server.');
    }

    if (!args.length) {
      return message.reply('❌ Usage: `.unban <userId/all> [reason]` or `/unban user:<userId/all>`');
    }

    const rawUser = args[0];

    if (rawUser.toLowerCase() === 'all') {
      const statusMsg = await message.reply('⏳ **Preparing mass unban...**');
      return handleMassUnban(message.guild, message.author, async (msgData) => {
        await statusMsg.edit(msgData).catch(() => {
          message.channel.send(msgData);
        });
      });
    }

    const userId = rawUser.replace(/[^0-9]/g, '');
    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (!userId || userId.length < 17 || userId.length > 20) {
      return message.reply('❌ Please provide a valid 17-20 digit user ID.');
    }

    try {
      const ban = await message.guild.bans.fetch(userId).catch(() => null);
      if (!ban) {
        return message.reply('❌ That user is not currently banned in this server.');
      }

      await message.guild.members.unban(userId, `${reason} | Unbanned by ${message.author.tag}`);

      const userDisplay = ban.user ? `${ban.user.tag} (${userId})` : userId;

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

async function handleMassUnban(guild, executor, replyCallback) {
  try {
    const bans = await guild.bans.fetch().catch(() => null);
    if (!bans || bans.size === 0) {
      return replyCallback({ content: '❌ There are no banned members in this server.' });
    }

    const total = bans.size;
    await replyCallback(`⏳ **Found ${total} ban entries. Unbanning all members...**`);

    let unbanned = 0;
    let failed = 0;

    for (const ban of bans.values()) {
      try {
        await guild.members.unban(ban.user.id, `Mass unban by ${executor.tag}`);
        unbanned++;
      } catch {
        failed++;
      }
    }

    const embed = new EmbedBuilder()
      .setColor(0x00D632)
      .setTitle('✅ Mass Unban Complete')
      .setDescription(
        `Successfully cleared the server ban list!\n\n` +
        `• **Total Bans Scanned:** **${total}**\n` +
        `• **Successfully Unbanned:** **${unbanned}**\n` +
        (failed > 0 ? `• **Failed:** \`${failed}\`\n` : '') +
        `• **Moderator:** <@${executor.id}>`
      )
      .setTimestamp();

    return replyCallback({ content: null, embeds: [embed] });
  } catch (err) {
    console.error('[Mass Unban Error]:', err);
    return replyCallback({ content: `❌ Failed to execute mass unban: \`${err.message}\`` });
  }
}
