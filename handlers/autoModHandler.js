const { PermissionsBitField } = require('discord.js');

// Protected User IDs who cannot be pinged
const PROTECTED_PING_USER_IDS = ['674218467041345536', '1508174981396168755'];

// Users who can ping each other / bypass
const BYPASS_USER_IDS = ['1508174981396168755', '674218467041345536'];

async function handleAutoMod(message) {
  if (!message.guild || message.author.bot) return false;

  const authorId = message.author.id;

  // If author has admin permissions, allow
  if (message.member && (
    message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
  )) {
    return false;
  }

  // Check if message mentions any protected user (excluding if user pings themselves)
  const mentionedProtectedUser = PROTECTED_PING_USER_IDS.find(id => {
    if (authorId === id) return false; // Allowed to ping oneself

    // Check direct mentions in message.mentions
    if (message.mentions?.users?.has(id)) return true;

    // Check raw string regex for user ID mention
    const pingRegex = new RegExp(`<@!?${id}>`, 'i');
    if (pingRegex.test(message.content)) return true;

    return false;
  });

  if (mentionedProtectedUser) {
    try {
      // 1. Delete the violating message immediately
      await message.delete().catch(() => {});

      // 2. Send temporary warning message
      const warnMsg = await message.channel.send({
        content: `⛔ <@${authorId}>, do not ping <@${mentionedProtectedUser}>! Pinging is disabled for this user.`,
        allowedMentions: { users: [authorId] }, // only ping the offender
      });

      // 3. Auto-delete warning after 5 seconds to keep chat clean
      setTimeout(() => {
        warnMsg.delete().catch(() => {});
      }, 5000);

      return true; // Handled by AutoMod
    } catch (err) {
      console.error('[AUTOMOD ERROR]', err.message);
    }
  }

  return false;
}

module.exports = { handleAutoMod, PROTECTED_PING_USER_IDS };
