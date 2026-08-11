const { SlashCommandBuilder, PermissionsBitField, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];
const VERIFIED_ROLE_IDS = ['1396299470244810942', '1399811369489928354'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockserver')
    .setDescription('Lock all server channels for @everyone and require verification roles to view')
    .addChannelOption(opt =>
      opt.setName('verify_channel')
        .setDescription('The verification channel that should stay visible to unverified users')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
    const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id);
    if (!isBypass && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Administrator permission required.', ephemeral: true });
    }

    await interaction.deferReply();
    const verifyChannel = interaction.options.getChannel('verify_channel') || interaction.channel;
    const res = await lockAllChannelsForGuild(interaction.guild, verifyChannel.id);

    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('🔒 Server Channels Locked to Verified Members')
      .setDescription(
        `Successfully locked **${res.lockedCount}** channels.\n\n` +
        `• **@everyone**: Hidden (\`ViewChannel: ❌\`)\n` +
        `• **Verified Roles** (<@&1396299470244810942>, <@&1399811369489928354>): Visible (\`ViewChannel: ✅\`)\n` +
        `• **Verification Channel** (<#${verifyChannel.id}>): Visible to all users so they can verify!`
      )
      .setFooter({ text: 'HTB Server Security' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  async prefixExecute(message, args) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Administrator permission required.');
    }

    const statusMsg = await message.channel.send('⏳ Locking all channels and setting verification role permissions...');
    const verifyChannel = message.mentions.channels.first() || message.channel;
    const res = await lockAllChannelsForGuild(message.guild, verifyChannel.id);

    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('🔒 Server Channels Locked to Verified Members')
      .setDescription(
        `Successfully locked **${res.lockedCount}** channels.\n\n` +
        `• **@everyone**: Hidden (\`ViewChannel: ❌\`)\n` +
        `• **Verified Roles** (<@&1396299470244810942>, <@&1399811369489928354>): Visible (\`ViewChannel: ✅\`)\n` +
        `• **Verification Channel** (<#${verifyChannel.id}>): Visible to all users so they can verify!`
      )
      .setFooter({ text: 'HTB Server Security' })
      .setTimestamp();

    await statusMsg.edit({ content: '', embeds: [embed] });
  }
};

async function lockAllChannelsForGuild(guild, verifyChannelId) {
  const channels = await guild.channels.fetch();
  let lockedCount = 0;

  for (const channel of channels.values()) {
    if (!channel) continue;

    // Keep verification channel visible to @everyone
    if (channel.id === verifyChannelId) {
      try {
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          ViewChannel: true,
          SendMessages: false,
        });
      } catch {}
      continue;
    }

    try {
      // Hide from @everyone
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: false,
      });

      // Show to Verified Role 1
      await channel.permissionOverwrites.edit('1396299470244810942', {
        ViewChannel: true,
      });

      // Show to Verified Role 2
      await channel.permissionOverwrites.edit('1399811369489928354', {
        ViewChannel: true,
      });

      lockedCount++;
      await new Promise(r => setTimeout(r, 250)); // Rate limit buffer
    } catch (e) {
      console.warn(`[Lock Channel Err ${channel.name}]:`, e.message);
    }
  }

  return { lockedCount };
}
