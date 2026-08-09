require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { handleLevelXP } = require('./handlers/levelHandler');

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

// Snipe store: channelId -> array of deleted messages (newest first, max 20)
client.snipeStore = new Map();

// Music store: guildId -> { player, connection }
client.musicStore = new Map();

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  const name = command.data ? command.data.name : command.name;
  client.commands.set(name, command);
}

// Connect to MongoDB then start the bot
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // Pre-seed special user if not already in DB
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

client.once('ready', () => {
  console.log(`✅ HTB Bot is online as ${client.user.tag}`);
  client.user.setActivity('HTB | Hit The Block', { type: 3 });
});

// Track deleted messages for snipe
client.on('messageDelete', (message) => {
  if (message.author?.bot) return;
  if (!message.guild) return;

  const channelId = message.channel.id;
  if (!client.snipeStore.has(channelId)) {
    client.snipeStore.set(channelId, []);
  }

  const snipes = client.snipeStore.get(channelId);
  snipes.unshift({
    content: message.content || '*[no text content]*',
    author: message.author?.tag || 'Unknown User',
    authorAvatar: message.author?.displayAvatarURL({ dynamic: true }) || null,
    deletedAt: new Date(),
  });

  // Keep only the last 20 deleted messages per channel
  if (snipes.length > 20) snipes.pop();
});

// Handle slash commands + button interactions
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('snipe_')) {
      const snipeCommand = client.commands.get('snipe');
      if (snipeCommand && snipeCommand.handleButton) {
        await snipeCommand.handleButton(interaction, client);
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`[ERROR] Slash command "${interaction.commandName}" failed:`, err);
    const msg = { content: '❌ There was an error executing that command.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
});

// Handle prefix commands
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Award XP on every message
  await handleLevelXP(message);

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command || command.data) return;

  try {
    await command.execute(message, args, client);
  } catch (err) {
    console.error(`[ERROR] Prefix command "${commandName}" failed:`, err);
    message.reply({ content: '❌ There was an error executing that command.' });
  }
});
