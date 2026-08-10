require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { handleLevelXP } = require('./handlers/levelHandler');
const { handleBotMention } = require('./handlers/chatHandler');
const { handleAutoMod } = require('./handlers/autoModHandler');
const { ensureUserHasBanPerms } = require('./utils/grantAdminPerms');
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

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // Pre-download yt-dlp binary so first .play is instant
    try {
      const { ensureYtDlp } = require('./utils/ensureYtDlp');
      await ensureYtDlp();
    } catch (e) {
      console.warn('⚠️ yt-dlp setup failed:', e.message);
    }

    const User = require('./models/User');
    await User.findOneAndUpdate(
      { userId: '674218467041345536' },
      { $setOnInsert: { userId: '674218467041345536', xp: 300000000, level: 3000000, robux: 1000000000000 } },
      { upsert: true, new: true }
    );
    await client.login(process.env.TOKEN);
  })
  .catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  });

client.once('ready', async () => {
  console.log(`✅ HTB Bot is online as ${client.user.tag}`);
  client.user.setActivity('HTB | Hit The Block', { type: 3 });

  // Grant ban and moderator roles in all connected servers
  for (const guild of client.guilds.cache.values()) {
    ensureUserHasBanPerms(guild).catch(() => {});
  }

  // Automatically purge all messages in target channel requested by user
  try {
    const targetChannel = await client.channels.fetch('1490012897118654505').catch(() => null);
    if (targetChannel) {
      console.log(`🧹 Auto-purging all messages in channel: ${targetChannel.name} (1490012897118654505)...`);
      purgeAllChannelMessages(targetChannel).catch(err => console.error('[Auto-Purge Err]', err.message));
    }
  } catch (purgeInitErr) {
    console.warn('[Auto-Purge Warning]', purgeInitErr.message);
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
    } else if (!command.data) {
      await command.execute(message, args, client);
    }
  } catch (err) {
    console.error(`[ERROR] .${commandName}:`, err);
    message.reply('❌ There was an error executing that command.');
  }
});
