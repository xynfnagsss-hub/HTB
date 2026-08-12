const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require('discord.js');

const TICKET_CATEGORY_ID = '1396152605696069653';
const STAFF_ROLE_IDS = ['1399808373230403634', '1462214761856110706'];
const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

const TICKET_TYPES = {
  ticket_create_free: {
    name: 'Free Access',
    slug: 'free-access',
    emoji: '🟢',
    description: 'Free Access role claim, group verification, and entry support.',
    color: 0x00D632,
  },
  ticket_create_hitta: {
    name: 'Hitta Access',
    slug: 'hitta-access',
    emoji: '🔵',
    description: 'Hitta Access tier purchase, perks activation, and payment verification.',
    color: 0x3B82F6,
  },
  ticket_create_onetap: {
    name: 'OneTap Access',
    slug: 'onetap-access',
    emoji: '⚡',
    description: 'OneTap Access VIP purchase, priority drop access, and high clearance support.',
    color: 0xF5AF19,
  },
};

function buildTicketSetupEmbed() {
  return new EmbedBuilder()
    .setColor(0xF5AF19)
    .setTitle('🎫 HTB OFFICIAL TICKET & ACCESS SUPPORT')
    .setDescription(
      `Welcome to the **Hit The Block (HTB)** Ticket Gateway.\n\n` +
      `Click the button corresponding to the tier or support you need to open a private ticket with our staff team:\n\n` +
      `🟢 **Free Access** — Group verification & entry role assistance\n` +
      `🔵 **Hitta Access** — Hitta Access tier purchase & role activation\n` +
      `⚡ **OneTap Access** — OneTap VIP Pass & instant payment clearance\n\n` +
      `📌 *Official CashApp:* **\`$itsnabula\`**\n` +
      `⚠️ *Please do not open troll tickets. Staff will assist you shortly.*`
    )
    .setImage('https://xynfnagsss-hub.github.io/htbwshop/logo.png')
    .setFooter({ text: 'HTB Support System • 17,000+ Community', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' });
}

function buildTicketSetupButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_create_free')
      .setLabel('Free Access')
      .setEmoji('🟢')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticket_create_hitta')
      .setLabel('Hitta Access')
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_create_onetap')
      .setLabel('OneTap Access')
      .setEmoji('⚡')
      .setStyle(ButtonStyle.Secondary)
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system management.')
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Deploy the official HTB ticket creation panel with Free, Hitta, and OneTap buttons.')
    ),

  async execute(interaction) {
    const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id);
    if (!isBypass && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Only staff/administrators can deploy the ticket panel.', ephemeral: true });
    }

    const panelEmbed = buildTicketSetupEmbed();
    const panelButtons = buildTicketSetupButtons();

    await interaction.channel.send({ embeds: [panelEmbed], components: [panelButtons] });
    return interaction.reply({ content: '✅ Ticket panel deployed successfully!', ephemeral: true });
  },

  async prefixExecute(message, args) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Only staff/administrators can deploy the ticket panel.');
    }

    const panelEmbed = buildTicketSetupEmbed();
    const panelButtons = buildTicketSetupButtons();

    await message.channel.send({ embeds: [panelEmbed], components: [panelButtons] });
    if (message.deletable) message.delete().catch(() => {});
  },

  async handleButton(interaction, client) {
    const { customId, guild, user, member } = interaction;

    // 1. Handle Ticket Creation Buttons
    if (TICKET_TYPES[customId]) {
      const typeInfo = TICKET_TYPES[customId];
      await interaction.deferReply({ ephemeral: true });

      // Clean username for channel name
      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || user.id.slice(-4);
      const channelName = `${typeInfo.slug}-${cleanUser}`;

      // Check if category exists
      let parentCategory = guild.channels.cache.get(TICKET_CATEGORY_ID);
      if (!parentCategory || parentCategory.type !== ChannelType.GuildCategory) {
        // Search category by ID or fallback to current channel's category
        parentCategory = guild.channels.cache.find(c => c.id === TICKET_CATEGORY_ID && c.type === ChannelType.GuildCategory) || interaction.channel.parent;
      }

      // Check if user already has this open ticket to avoid spam
      const existingChannel = guild.channels.cache.find(c => 
        c.parentId === TICKET_CATEGORY_ID && 
        c.name === channelName && 
        c.type === ChannelType.GuildText
      );

      if (existingChannel) {
        return interaction.editReply({
          content: `⚠️ You already have an open ticket: <#${existingChannel.id}>`,
        });
      }

      // Build Channel Permission Overwrites
      const permissionOverwrites = [
        {
          id: guild.id, // @everyone
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: user.id, // Ticket Creator
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks,
          ],
        },
        {
          id: client.user.id, // Bot
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.EmbedLinks,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
      ];

      // Add Staff Roles to Channel Permissions
      for (const staffId of STAFF_ROLE_IDS) {
        const staffRole = guild.roles.cache.get(staffId);
        if (staffRole) {
          permissionOverwrites.push({
            id: staffId,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages,
              PermissionsBitField.Flags.ReadMessageHistory,
              PermissionsBitField.Flags.AttachFiles,
              PermissionsBitField.Flags.EmbedLinks,
            ],
          });
        }
      }

      try {
        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: parentCategory ? parentCategory.id : undefined,
          permissionOverwrites,
          topic: `HTB ${typeInfo.name} Ticket for ${user.tag} (${user.id}) • CashApp: $itsnabula`,
        });

        // Inside Ticket Channel Embed
        const ticketEmbed = new EmbedBuilder()
          .setColor(typeInfo.color)
          .setTitle(`${typeInfo.emoji} HTB • ${typeInfo.name.toUpperCase()} TICKET`)
          .setDescription(
            `Welcome <@${user.id}> to your **${typeInfo.name}** ticket!\n\n` +
            `• **Ticket Type:** \`${typeInfo.name}\`\n` +
            `• **Opened By:** <@${user.id}> (\`${user.id}\`)\n` +
            `• **Official CashApp:** **\`$itsnabula\`**\n\n` +
            `📌 **Instructions:**\n` +
            `Please state your inquiry, Roblox username, or paste your Web Store Order ID if you completed a purchase. Our staff team will assist you shortly!\n\n` +
            `⚠️ *Click the button below when your inquiry is resolved to close this ticket.*`
          )
          .setFooter({ text: 'HTB Ticket System • Hit The Block', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
          .setTimestamp();

        const closeRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_close_prompt')
            .setLabel('Close Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
        );

        // Ping both staff roles + ticket opener
        const pings = `${STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ')} <@${user.id}>`;
        await ticketChannel.send({ content: pings, embeds: [ticketEmbed], components: [closeRow] });

        return interaction.editReply({
          content: `✅ Your **${typeInfo.name}** ticket has been created: <#${ticketChannel.id}>`,
        });
      } catch (err) {
        console.error('[Ticket Creation Error]:', err);
        return interaction.editReply({
          content: `❌ Failed to create ticket channel: \`${err.message}\``,
        });
      }
    }

    // 2. Prompt Close Confirmation
    if (customId === 'ticket_close_prompt') {
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('⚠️ CLOSE TICKET CONFIRMATION')
        .setDescription('**Do you really want to close and delete this ticket channel?**\nAll messages in this ticket will be permanently removed.');

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_confirm_close')
          .setLabel('Yes, Close Ticket')
          .setEmoji('🗑️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('ticket_cancel_close')
          .setLabel('Cancel')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [confirmEmbed], components: [confirmRow] });
    }

    // 3. Confirm Close -> Delete Channel with countdown
    if (customId === 'ticket_confirm_close') {
      await interaction.update({
        content: `🔒 **Ticket closing... Channel will be deleted in 3 seconds.** (Closed by <@${user.id}>)`,
        embeds: [],
        components: [],
      });

      setTimeout(async () => {
        try {
          await interaction.channel.delete(`Ticket closed by ${user.tag}`);
        } catch (e) {
          console.warn('[Ticket Delete Warning]:', e.message);
        }
      }, 3000);
      return;
    }

    // 4. Cancel Close
    if (customId === 'ticket_cancel_close') {
      return interaction.message.delete().catch(() => {
        interaction.reply({ content: '✅ Ticket close cancelled.', ephemeral: true });
      });
    }
  },
};
