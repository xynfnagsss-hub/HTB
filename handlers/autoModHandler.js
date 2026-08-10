const { PermissionsBitField } = require('discord.js');

// Protected User IDs who cannot be directly @ mentioned
const PROTECTED_PING_USER_IDS = ['674218467041345536'];

async function handleAutoMod(message) {
  if (!message.guild || message.author.bot) return false;

  const authorId = message.author.id;

  // If author is one of the protected users or has admin/manage perms, allow completely
  if (
    PROTECTED_PING_USER_IDS.includes(authorId) ||
    (message.member && (
      message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
      message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)
    ))
  ) {
    return false;
  }

  // 1. If it's a message reply, check if they typed an explicit manual @mention in text
  const content = message.content || '';

  // Check if message content contains an explicit typed mention: <@ID> or <@!ID>
  const mentionedProtectedUser = PROTECTED_PING_USER_IDS.find(id => {
    if (authorId === id) return false;
    const pingRegex = new RegExp(`<@!?${id}>`, 'i');
    return pingRegex.test(content);
  });

  // If there is NO explicit typed mention in the text content, ALLOW IT (Replies work freely!)
  if (!mentionedProtectedUser) {
    return false;
  }

  // 2. Only block if they explicitly typed an @mention in the message content
  try {
    await message.delete().catch(() => {});

    const warnMsg = await message.channel.send({
      content: `⛔ <@${authorId}>, please do not directly @ ping <@${mentionedProtectedUser}>! (Replies are allowed, direct @ mentions are disabled).`,
      allowedMentions: { users: [authorId] },
    });

    setTimeout(() => {
      warnMsg.delete().catch(() => {});
    }, 4000);

    return true;
  } catch (err) {
    console.error('[AUTOMOD ERROR]', err.message);
  }

  return false;
}

module.exports = { handleAutoMod, PROTECTED_PING_USER_IDS };
