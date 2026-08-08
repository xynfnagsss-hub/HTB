require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
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
  ],
});

const PREFIX = '.';

client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  // Slash commands have a .data property, prefix commands have a .name
  const name = command.data ? command.data.name : command.name;
  client.commands.set(name, command);
}

client.once('ready', () => {
  console.log(`✅ HTB Bot is online as ${client.user.tag}`);
  client.user.setActivity('HTB | Hit The Block', { type: 3 });
});

// Handle slash commands
client.on('interactionCreate', async (interaction) => {
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

// Handle prefix commands (.market, .payout, .level)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Award XP on every message
  await handleLevelXP(message);

  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  // Only run prefix commands (ones without .data)
  if (!command || command.data) return;

  try {
    await command.execute(message, args, client);
  } catch (err) {
    console.error(`[ERROR] Prefix command "${commandName}" failed:`, err);
    message.reply({ content: '❌ There was an error executing that command.' });
  }
});

client.login(process.env.TOKEN);
