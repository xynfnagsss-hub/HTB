const { PermissionsBitField } = require('discord.js');

// Protected Admin / Owner User IDs who cannot be pinged under any circumstances
const PROTECTED_PING_USER_IDS = [
  '674218467041345536',
  '1508174981396168755',
];

async function handleAutoMod(message) {
  if (!message.guild || message.author.bot) return false;

  const authorId = message.author.id;

  // If author is one of the protected owners or has Administrator permissions, allow completely
  if (
    PROTECTED_PING_USER_IDS.includes(authorId) ||
    (message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator))
  ) {
    return false;
  }

  const content = message.content || '';

  // Check 1: Discord Mentions Collection (Direct @mentions, reply pings with ping ON)
  const mentionedUser = PROTECTED_PING_USER_IDS.find(id => message.mentions?.users?.has(id));

  // Check 2: Content Regex for typed <@ID> or <@!ID>
  const typedPing = PROTECTED_PING_USER_IDS.find(id => {
    const pingRegex = new RegExp(`<@!?${id}>`, 'i');
    return pingRegex.test(content);
  });

  const targetedId = mentionedUser || typedPing;

  // If a protected admin was pinged, delete immediately!
  if (targetedId) {
    try {
      if (message.deletable) {
        await message.delete().catch(() => {});
      }

      const warnMsg = await message.channel.send({
        content: `⛔ <@${authorId}>, you are not allowed to ping owners or administrators!`,
        allowedMentions: { users: [authorId] },
      }).catch(() => null);

      if (warnMsg) {
        setTimeout(() => {
          warnMsg.delete().catch(() => {});
        }, 4000);
      }

      return true;
    } catch (err) {
      console.error('[Anti-Ping Error]:', err.message);
      return true;
    }
  }

  return false;
}

module.exports = { handleAutoMod, PROTECTED_PING_USER_IDS };
