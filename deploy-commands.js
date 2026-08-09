require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  // Only register commands that have slash command data
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

async function deploy(retries = 3) {
  if (!process.env.TOKEN || !process.env.CLIENT_ID) {
    console.error('❌ TOKEN or CLIENT_ID is missing from .env');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Registering ${commands.length} slash command(s) (attempt ${attempt}/${retries})...`);
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );
      console.log('✅ Slash commands registered globally.');
      return;
    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message || err);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

deploy().catch(err => {
  console.error('❌ Failed to deploy slash commands:', err);
});
