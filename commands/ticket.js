const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require('discord.js');

const TICKET_CATEGORY_ID = '1399821317556932718';
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
  ticket_create_half: {
    name: 'Half Access',
    slug: 'half-access',
    emoji: '🔵',
    description: 'Half Access tier purchase, basic VIP perks, and payment verification.',
    color: 0x0EA5E9,
  },
  ticket_create_hitta: {
    name: 'Hitta Access',
    slug: 'hitta-access',
    emoji: '💎',
    description: 'Hitta Access tier purchase, VIP perks activation, and payment verification.',
    color: 0x3B82F6,
  },
  ticket_create_onetap: {
    name: 'OneTap Access',
    slug: 'onetap-access',
    emoji: '⚡',
    description: 'OneTap Access VIP purchase, priority drop access, and high clearance support.',
    color: 0xF5AF19,
  },
  ticket_create_general: {
    name: 'General Support',
    slug: 'general',
    emoji: '📩',
    description: 'General server inquiries, bot support, and member assistance.',
    color: 0x9333EA,
  },
  ticket_create_report: {
    name: 'Report a Member',
    slug: 'report',
    emoji: '🚨',
    description: 'Report rule violations, scam attempts, or server misconduct.',
    color: 0xEF4444,
  },
};

function buildTicketSetupEmbed() {
  return new EmbedBuilder()
    .setColor(0xF5AF19)
    .setAuthor({ name: 'HIT THE BLOCK • 17,000+ COMMUNITY', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
    .setTitle('🎫 HIT THE BLOCK • TICKET GATEWAY')
    .setDescription(
      `Welcome to the official **Hit The Block (HTB)** Support & Access Gateway.\n\n` +
      `Click a button below to open a private ticket with our staff team:\n\n` +
      `**Access Tiers:**\n` +
      `• 🟢 **Free Access** — Group auto-role & verification\n` +
      `• 🔵 **Half Access** — Half Access tier & role claim\n` +
      `• 💎 **Hitta Access** — Hitta VIP clearance & perk activation\n` +
      `• ⚡ **OneTap Access** — OneTap VIP Pass & instant clearance\n\n` +
      `**Assistance & Reports:**\n` +
      `• 📩 **General Support** — Questions, bot issues & assistance\n` +
      `• 🚨 **Report a Member** — Report scams, pings & misconduct`
    )
    .addFields(
      { name: '💳 Official CashApp', value: '`$itsnabula` *(Include Order ID)*', inline: true },
      { name: '🌐 Web Marketplace', value: '[htbwshop.github.io](https://xynfnagsss-hub.github.io/htbwshop/)', inline: true },
      { name: '🛡️ Staff Support', value: '24/7 active staff ready to assist you.', inline: false }
    )
    .setImage('https://xynfnagsss-hub.github.io/htbwshop/logo.png')
    .setFooter({ text: 'HTB Support System • 17,000+ Members • Instant Delivery', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
    .setTimestamp();
}

function buildTicketSetupButtons() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_create_free')
      .setLabel('Free Access')
      .setEmoji('🟢')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticket_create_half')
      .setLabel('Half Access')
      .setEmoji('🔵')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_create_hitta')
      .setLabel('Hitta Access')
      .setEmoji('💎')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_create_onetap')
      .setLabel('OneTap Access')
      .setEmoji('⚡')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_create_general')
      .setLabel('General Support')
      .setEmoji('📩')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ticket_create_report')
      .setLabel('Report a Member')
      .setEmoji('🚨')
      .setStyle(ButtonStyle.Danger)
  );

  return [row1, row2];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system management.')
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Deploy the official HTB ticket creation panel.')
    ),

  async execute(interaction) {
    const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id);
    if (!isBypass && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Only staff/administrators can deploy the ticket panel.', ephemeral: true });
    }

    const panelEmbed = buildTicketSetupEmbed();
    const panelButtonRows = buildTicketSetupButtons();

    await interaction.channel.send({ embeds: [panelEmbed], components: panelButtonRows });
    return interaction.reply({ content: '✅ Ticket panel deployed successfully!', ephemeral: true });
  },

  async prefixExecute(message, args) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild) && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Only staff/administrators can deploy the ticket panel.');
    }

    const panelEmbed = buildTicketSetupEmbed();
    const panelButtonRows = buildTicketSetupButtons();

    await message.channel.send({ embeds: [panelEmbed], components: panelButtonRows });
    if (message.deletable) message.delete().catch(() => {});
  },

  async handleButton(interaction, client) {
    const { customId, guild, user, member } = interaction;

    // 1. Handle Ticket Creation Buttons
    if (TICKET_TYPES[customId]) {
      const typeInfo = TICKET_TYPES[customId];
      await interaction.deferReply({ ephemeral: true });

      const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || user.id.slice(-4);
      const channelName = `${typeInfo.slug}-${cleanUser}`;

      let parentCategory = guild.channels.cache.get(TICKET_CATEGORY_ID);
      if (!parentCategory || parentCategory.type !== ChannelType.GuildCategory) {
        parentCategory = guild.channels.cache.find(c => c.id === TICKET_CATEGORY_ID && c.type === ChannelType.GuildCategory) || interaction.channel.parent;
      }

      const existingChannel = guild.channels.cache.find(c => 
        c.parentId === TICKET_CATEGORY_ID && 
        c.name === channelName && 
        c.type === ChannelType.GuildText
      );

      if (existingChannel) {
        return interaction.editReply({
          content: `⚠️ You already have an active ticket open: <#${existingChannel.id}>`,
        });
      }

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

        // Clean In-Ticket Embed
        const ticketEmbed = new EmbedBuilder()
          .setColor(typeInfo.color)
          .setAuthor({ name: `${user.tag} • ${typeInfo.name}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
          .setTitle(`${typeInfo.emoji} HTB • ${typeInfo.name.toUpperCase()} TICKET`)
          .setDescription(
            `Welcome <@${user.id}> to your private **${typeInfo.name}** ticket!\n\n` +
            `Our staff team has been notified. Please review the details below:`
          )
          .addFields(
            { name: '👤 Ticket Creator', value: `<@${user.id}>\n\`${user.id}\``, inline: true },
            { name: '🎫 Ticket Category', value: `\`${typeInfo.name}\``, inline: true },
            { name: '💳 Official CashApp', value: '`$itsnabula`', inline: true },
            { 
              name: '📌 What To Send Below', 
              value: 
                `• **Roblox Username** (for role & group rank syncing)\n` +
                `• **Order ID** (if purchased on site: \`HTB-XXXXXX\`)\n` +
                `• **Detailed Inquiry** or proof of payment screenshot`,
              inline: false 
            }
          )
          .setFooter({ text: 'HTB Ticket System • Staff will claim shortly • Click below to close', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' })
          .setTimestamp();

        const ticketActionsRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_claim')
            .setLabel('Claim Ticket')
            .setEmoji('🛡️')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('ticket_close_prompt')
            .setLabel('Close Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
        );

        const pings = `${STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ')} <@${user.id}>`;
        await ticketChannel.send({ content: pings, embeds: [ticketEmbed], components: [ticketActionsRow] });

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

    // 2. Handle Staff Claiming Ticket
    if (customId === 'ticket_claim') {
      const isStaff = ADMIN_BYPASS_USERS.includes(user.id) || 
        member.permissions.has(PermissionsBitField.Flags.ManageMessages) || 
        member.permissions.has(PermissionsBitField.Flags.ManageChannels) || 
        STAFF_ROLE_IDS.some(id => member.roles.cache.has(id));

      if (!isStaff) {
        return interaction.reply({
          content: '❌ Only staff members can claim tickets.',
          ephemeral: true,
        });
      }

      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_claimed_info')
          .setLabel(`Claimed by ${user.username}`)
          .setEmoji('✅')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('ticket_close_prompt')
          .setLabel('Close Ticket')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      await interaction.update({ components: [updatedRow] }).catch(() => {});

      const claimEmbed = new EmbedBuilder()
        .setColor(0x00D632)
        .setTitle('🛡️ TICKET CLAIMED')
        .setDescription(
          `Staff member <@${user.id}> has **claimed** this ticket!\n\n` +
          `They will be assisting you with your inquiry or order directly.`
        )
        .setFooter({ text: `Claimed by @${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();

      await interaction.channel.send({ embeds: [claimEmbed] });

      const currentTopic = interaction.channel.topic || '';
      if (!currentTopic.includes('Claimed by')) {
        await interaction.channel.setTopic(`${currentTopic} • Claimed by: ${user.tag} (${user.id})`).catch(() => {});
      }
      return;
    }

    // 3. Prompt Close Confirmation
    if (customId === 'ticket_close_prompt') {
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('⚠️ CLOSE TICKET CONFIRMATION')
        .setDescription(
          `**Are you sure you want to permanently close and delete this ticket channel?**\n\n` +
          `• All message transcripts in this channel will be removed.\n` +
          `• Click **"Yes, Close Ticket"** to proceed or **"Cancel"** to keep it open.`
        )
        .setFooter({ text: 'HTB Ticket Management • Action Cannot Be Undone', iconURL: 'https://xynfnagsss-hub.github.io/htbwshop/favicon.png' });

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

    // 4. Confirm Close -> Delete Channel with countdown
    if (customId === 'ticket_confirm_close') {
      const closingEmbed = new EmbedBuilder()
        .setColor(0xEF4444)
        .setTitle('🔒 TICKET CLOSING...')
        .setDescription(`This channel will be permanently deleted in **3 seconds**.\n\n*Closed by <@${user.id}>.*`);

      await interaction.update({
        content: null,
        embeds: [closingEmbed],
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

    // 5. Cancel Close
    if (customId === 'ticket_cancel_close') {
      return interaction.message.delete().catch(() => {
        interaction.reply({ content: '✅ Ticket close cancelled.', ephemeral: true });
      });
    }
  },
};
