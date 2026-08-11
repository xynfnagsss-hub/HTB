require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { handleLevelXP } = require('./handlers/levelHandler');
const { handleBotMention } = require('./handlers/chatHandler');
const { handleAutoMod } = require('./handlers/autoModHandler');
const { ensureUserHasBanPerms } = require('./utils/grantAdminPerms');
const { ensureNativeAutoModRule } = require('./utils/ensureAutoModRule');
const { purgeAllChannelMessages } = require('./utils/purgeChannel');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const PREFIX = '.';

// Snipe store: channelId -> [{ content, author, authorAvatar, deletedAt }]
client.snipeStore = new Map();

// Music store: guildId -> { player, connection }
client.musicStore = new Map();

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  const name = command.data ? command.data.name : command.name;
  client.commands.set(name, command);
}

// Aliases
client.commands.set('purge', client.commands.get('clear'));
client.commands.set('nuke', client.commands.get('clear'));
client.commands.set('p', client.commands.get('play'));
client.commands.set('q', client.commands.get('queue'));
client.commands.set('np', client.commands.get('nowplaying'));
client.commands.set('next', client.commands.get('skip'));
client.commands.set('leave', client.commands.get('stop'));
client.commands.set('disconnect', client.commands.get('stop'));
client.commands.set('dc', client.commands.get('stop'));
client.commands.set('unpause', client.commands.get('resume'));
client.commands.set('repeat', client.commands.get('loop'));
client.commands.set('link', client.commands.get('verify'));
client.commands.set('rblx', client.commands.get('roblox'));

// DisTube Music Engine (Permanent Zero-Drop Voice Playback)
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { EmbedBuilder } = require('discord.js');

client.distube = new DisTube(client, {
  emitNewSongOnly: true,
  emitAddSongWhenCreatingQueue: false,
  emitAddListWhenCreatingQueue: false,
  plugins: [
    new YtDlpPlugin({ update: true }),
    new SpotifyPlugin(),
    new SoundCloudPlugin(),
  ],
});

client.distube
  .on('playSong', (queue, song) => {
    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('🎵 Now Playing')
      .setDescription(`**[${song.name}](${song.url})**`)
      .addFields(
        { name: 'Duration', value: song.formattedDuration || 'Live / Audio', inline: true },
        { name: 'Requested By', value: `<@${song.user?.id || song.member?.id}>`, inline: true },
        { name: 'Volume', value: `${queue.volume}%`, inline: true }
      )
      .setThumbnail(song.thumbnail)
      .setFooter({ text: 'HTB Music System • 17k+ Community', iconURL: 'https://htbwshop.jo3.org/favicon.png' })
      .setTimestamp();

    queue.textChannel?.send({ embeds: [embed] }).catch(() => {});
  })
  .on('addSong', (queue, song) => {
    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('➕ Added to Queue')
      .setDescription(`**[${song.name}](${song.url})**`)
      .addFields(
        { name: 'Duration', value: song.formattedDuration || 'Live / Audio', inline: true },
        { name: 'Position in Queue', value: `#${queue.songs.length}`, inline: true }
      )
      .setThumbnail(song.thumbnail)
      .setFooter({ text: `Requested by ${song.user?.tag || 'User'}` })
      .setTimestamp();

    queue.textChannel?.send({ embeds: [embed] }).catch(() => {});
  })
  .on('addList', (queue, playlist) => {
    const embed = new EmbedBuilder()
      .setColor(0xF5AF19)
      .setTitle('📑 Playlist Added to Queue')
      .setDescription(`Added **${playlist.songs.length}** songs from **${playlist.name}**`)
      .setFooter({ text: `Requested by ${playlist.user?.tag || 'User'}` })
      .setTimestamp();

    queue.textChannel?.send({ embeds: [embed] }).catch(() => {});
  })
  .on('error', (channel, error) => {
    console.error('[DisTube Error]:', error);
    if (channel) {
      channel.send(`❌ Music playback error: \`${error.message || 'Could not stream track'}\``).catch(() => {});
    }
  })
  .on('empty', (queue) => {
    queue.textChannel?.send('👋 Left voice channel because it was empty.').catch(() => {});
  })
  .on('finish', (queue) => {
    queue.textChannel?.send('✅ Finished playing all songs in the queue.').catch(() => {});
  });

// Roblox Integration Service
const { initRoblox, startGroupJoinWatcher } = require('./utils/robloxManager');

// Express Web Server for htbwshop.jo3.org Storefront
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  // Enforce HTTPS behind Railway reverse proxy
  if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  // Security Headers for SSL & Google/Chrome safety
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory fallback if MongoDB is connecting
const inMemoryOrders = new Map();
const Order = require('./models/Order');
const ADMIN_USER_IDS = ['674218467041345536', '1508174981396168755'];
const ADMIN_PASSCODE = 'HTB-ADMIN-2026';

// 1. Create / Save Order from Store
app.post('/api/orders', async (req, res) => {
  try {
    const { orderId, buyerTag, buyerId, items, totalAmount } = req.body;
    if (!orderId) return res.status(400).json({ error: 'Order ID is required' });

    const orderData = {
      orderId: orderId.trim().toUpperCase(),
      buyerTag: buyerTag || 'Unlinked Member',
      buyerId: buyerId || 'N/A',
      items: items || [],
      totalAmount: parseFloat(totalAmount) || 0,
      status: 'PENDING',
      createdAt: new Date(),
    };

    inMemoryOrders.set(orderData.orderId, orderData);

    try {
      if (mongoose.connection.readyState === 1) {
        await Order.findOneAndUpdate({ orderId: orderData.orderId }, orderData, { upsert: true, new: true });
      }
    } catch {}

    res.json({ success: true, order: orderData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Look up & Verify Order by ID
app.post('/api/orders/verify', async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'Please enter an Order ID' });

    const cleanId = orderId.trim().toUpperCase();
    let order = inMemoryOrders.get(cleanId);

    if (!order && mongoose.connection.readyState === 1) {
      order = await Order.findOne({ orderId: cleanId });
    }

    if (!order) {
      return res.status(404).json({ error: `Order ID "${cleanId}" not found in HTB records.` });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Update Order Status (Admin Only)
app.post('/api/orders/update-status', async (req, res) => {
  try {
    const { orderId, status, adminId } = req.body;
    const isAuth = ADMIN_USER_IDS.includes(String(adminId));
    if (!isAuth) return res.status(403).json({ error: 'Unauthorized: Discord Admin access required' });

    const cleanId = orderId.trim().toUpperCase();
    let order = inMemoryOrders.get(cleanId) || { orderId: cleanId };
    order.status = status || 'VERIFIED';
    order.updatedAt = new Date();
    order.verifiedBy = adminId || 'HTB Admin';
    inMemoryOrders.set(cleanId, order);

    if (mongoose.connection.readyState === 1) {
      await Order.findOneAndUpdate({ orderId: cleanId }, { status, verifiedBy: order.verifiedBy, updatedAt: new Date() }, { upsert: true });
    }

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Fetch All Recent Orders (Admin Only)
app.get('/api/orders', async (req, res) => {
  try {
    let orders = [];
    if (mongoose.connection.readyState === 1) {
      orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    }
    if (!orders || !orders.length) {
      orders = Array.from(inMemoryOrders.values()).reverse();
    }
    res.json({ success: true, orders });
  } catch (err) {
    res.json({ success: true, orders: Array.from(inMemoryOrders.values()) });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'HTB Storefront & Discord Bot',
    bot: client.user?.tag || 'connecting...',
    uptime: process.uptime(),
  });
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 HTB Storefront is live on port ${PORT} at 0.0.0.0 (htbwshop.jo3.org)`);
});

if (String(PORT) !== '3000') {
  try {
    app.listen(3000, '0.0.0.0', () => {
      console.log(`🌐 Also listening on port 3000 for Railway target port`);
    });
  } catch {}
}

// Global Process Guard so the server never crashes
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection Guard]:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception Guard]:', err);
});

async function startBotServices() {
  if (!process.env.MONGO_URI) {
    console.warn('⚠️ MONGO_URI environment variable is missing.');
  } else {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('✅ Connected to MongoDB');

      const User = require('./models/User');
      await User.findOneAndUpdate(
        { userId: '674218467041345536' },
        { $setOnInsert: { userId: '674218467041345536', xp: 300000000, level: 3000000, robux: 1000000000000 } },
        { upsert: true, new: true }
      ).catch(() => {});
    } catch (err) {
      console.error('⚠️ MongoDB connection error (retrying in background):', err.message);
    }
  }

  // Pre-download yt-dlp binary so first .play is instant
  try {
    const { ensureYtDlp } = require('./utils/ensureYtDlp');
    await ensureYtDlp();
  } catch (e) {
    console.warn('⚠️ yt-dlp setup failed:', e.message);
  }

  const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
  if (token) {
    client.login(token).catch(err => {
      console.error('❌ Discord client login error:', err.message);
    });
  } else {
    console.warn('⚠️ No Discord token provided in environment variables.');
  }
}

startBotServices();

client.once('ready', async () => {
  console.log(`✅ HTB Bot is online as ${client.user.tag}`);
  client.user.setActivity('HTB | Hit The Block', { type: 3 });

  // Grant ban and moderator roles + apply native Discord AutoMod anti-ping rules
  for (const guild of client.guilds.cache.values()) {
    ensureUserHasBanPerms(guild).catch(() => {});
    ensureNativeAutoModRule(guild).catch(() => {});
  }

  // Auto-purge target channel requested by user
  try {
    const purgeTarget = await client.channels.fetch('1428595146672439367').catch(() => null);
    if (purgeTarget) {
      console.log(`🧹 Auto-purging channel: #${purgeTarget.name} (1428595146672439367)...`);
      purgeAllChannelMessages(purgeTarget).then(res => {
        console.log(`✨ Purged ${res.deleted} message(s) from #${purgeTarget.name}`);
      }).catch(e => console.error('[Purge Error]:', e.message));
    }
  } catch (err) {
    console.warn('[Purge Target Error]:', err.message);
  }

  // Initialize Roblox Service & Group Join Watcher
  try {
    await initRoblox();
    startGroupJoinWatcher(client);
  } catch (robloxErr) {
    console.warn('[Roblox Init Warning]', robloxErr.message);
  }

  // Automatically register and sync slash commands on startup
  try {
    const slashCommands = [];
    for (const cmd of client.commands.values()) {
      if (cmd.data && !slashCommands.some(c => c.name === cmd.data.name)) {
        slashCommands.push(cmd.data.toJSON());
      }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: slashCommands }
    );
    console.log(`✅ Synced ${slashCommands.length} slash command(s) globally with Discord.`);
  } catch (err) {
    console.warn('⚠️ Slash command sync warning:', err.message);
  }
});

client.on('guildCreate', (guild) => {
  ensureNativeAutoModRule(guild).catch(() => {});
});

client.on('guildMemberAdd', (member) => {
  ensureUserHasBanPerms(member.guild).catch(() => {});
});

client.on('messageDelete', (message) => {
  if (message.author?.bot || !message.guild) return;
  const snipes = client.snipeStore.get(message.channel.id) || [];
  snipes.unshift({
    content: message.content || '*[no text content]*',
    author: message.author?.tag || 'Unknown',
    authorAvatar: message.author?.displayAvatarURL({ dynamic: true }) || null,
    deletedAt: new Date(),
  });
  if (snipes.length > 20) snipes.pop();
  client.snipeStore.set(message.channel.id, snipes);
});

client.on('interactionCreate', async (interaction) => {
  // 1. Verification Gateway Button Click
  if (interaction.isButton() && interaction.customId === 'htb_verify_btn') {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    const modal = new ModalBuilder()
      .setCustomId('htb_verify_modal')
      .setTitle('HTB Roblox Verification');

    const usernameInput = new TextInputBuilder()
      .setCustomId('roblox_username_input')
      .setLabel('Enter your exact Roblox Username')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. your_roblox_username')
      .setRequired(true)
      .setMaxLength(50);

    modal.addComponents(new ActionRowBuilder().addComponents(usernameInput));
    return await interaction.showModal(modal);
  }

  // 2. Verification Modal Submission
  if (interaction.isModalSubmit() && interaction.customId === 'htb_verify_modal') {
    const username = interaction.fields.getTextInputValue('roblox_username_input').trim();
    await interaction.deferReply({ ephemeral: true });

    try {
      const { linkRobloxUser, autoRankMemberFromDiscordRoles } = require('./utils/robloxManager');
      const { grantVerifiedRoles, buildVerifyEmbed, buildMustJoinEmbed } = require('./commands/verify');

      const profile = await linkRobloxUser(interaction.user.id, username);
      await grantVerifiedRoles(interaction.member);
      const rankResult = await autoRankMemberFromDiscordRoles(interaction.member);

      const embed = buildVerifyEmbed(interaction.user, profile, rankResult);
      return await interaction.editReply({
        content: '🎉 **Verification Complete!** You have been verified and granted full server access.',
        embeds: [embed]
      });
    } catch (err) {
      if (err.mustJoinGroup) {
        const { buildMustJoinEmbed } = require('./commands/verify');
        const groupEmbed = buildMustJoinEmbed(err.profile, err.groupId);
        return await interaction.editReply({ embeds: [groupEmbed] });
      }
      return await interaction.editReply({ content: `❌ Verification failed: \`${err.message}\`` });
    }
  }

  if (interaction.isButton() && interaction.customId.startsWith('snipe_')) {
    const cmd = client.commands.get('snipe');
    if (cmd?.handleButton) await cmd.handleButton(interaction, client);
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[ERROR] /${interaction.commandName}:`, err);
    const msg = { content: '❌ Error executing command.', ephemeral: true };
    interaction.replied || interaction.deferred ? interaction.followUp(msg) : interaction.reply(msg);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // 1. AutoMod Anti-Ping protection (deletes unauthorized pings of 674218467041345536)
  const isFiltered = await handleAutoMod(message);
  if (isFiltered) return;

  // 2. XP & Economy Leveling
  await handleLevelXP(message);

  if (message.guild) {
    ensureUserHasBanPerms(message.guild).catch(() => {});
  }

  // 3. Handle bot mentions / conversational chat
  if (!message.content.startsWith(PREFIX) && message.mentions.has(client.user)) {
    try {
      await handleBotMention(message, client);
    } catch (err) {
      console.error('[ERROR] handleBotMention:', err);
    }
    return;
  }

  // 4. Command prefix execution
  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    if (command.prefixExecute) {
      await command.prefixExecute(message, args, client);
    } else if (typeof command.execute === 'function') {
      await command.execute(message, args, client);
    }
  } catch (err) {
    console.error(`[ERROR] .${commandName}:`, err);
    message.reply('❌ There was an error executing that command.');
  }
});
