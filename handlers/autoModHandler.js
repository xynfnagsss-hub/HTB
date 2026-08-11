// Protected Admin / Owner User IDs who cannot be pinged under ANY circumstances
const PROTECTED_PING_USER_IDS = [
  '674218467041345536',
  '1508174981396168755',
];

async function handleAutoMod(message) {
  if (!message.guild || message.author.bot) return false;

  const authorId = message.author.id;

  // ONLY the owners themselves can ping each other or themselves. NO OTHER ROLES/MEMBERS ARE EXEMPT!
  if (PROTECTED_PING_USER_IDS.includes(authorId)) {
    return false;
  }

  const content = message.content || '';

  // 1. Direct Mentions Collection (Explicit @mention, ghost ping)
  const hasDirectMention = PROTECTED_PING_USER_IDS.some(id => message.mentions?.users?.has(id));

  // 2. Reply Ping (When replying to owner with notification toggle ON)
  const hasReplyPing = message.mentions?.repliedUser && PROTECTED_PING_USER_IDS.includes(message.mentions.repliedUser.id);

  // 3. Raw Content Regex (<@ID> or <@!ID>)
  const hasTypedPing = PROTECTED_PING_USER_IDS.some(id => {
    const pingRegex = new RegExp(`<@!?${id}>`, 'i');
    return pingRegex.test(content);
  });

  // 4. Referenced Message check (Fallback for Discord API reply payloads)
  let hasReferencedPing = false;
  if (message.reference && message.reference.messageId) {
    try {
      const refMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (refMsg && PROTECTED_PING_USER_IDS.includes(refMsg.author?.id)) {
        // If the reply mentions the user (or default mention was not turned off in text)
        if (message.mentions?.users?.has(refMsg.author.id) || !content.startsWith('@')) {
          hasReferencedPing = true;
        }
      }
    } catch {}
  }

  const isPingViolation = hasDirectMention || hasReplyPing || hasTypedPing || hasReferencedPing;

  if (isPingViolation) {
    try {
      if (message.deletable) {
        await message.delete().catch(() => {});
      }

      const warnMsg = await message.channel.send({
        content: `⛔ <@${authorId}>, you are **not** allowed to ping or reply-ping owners or administrators!`,
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
