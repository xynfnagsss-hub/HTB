async function purgeAllChannelMessages(channel) {
  if (!channel || !channel.isTextBased()) return { deleted: 0 };

  console.log(`[PURGE] Starting full purge for channel: ${channel.name} (${channel.id})...`);
  let totalDeleted = 0;
  let hasMore = true;

  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  while (hasMore) {
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      if (!messages || messages.size === 0) {
        hasMore = false;
        break;
      }

      const youngMessages = [];
      const oldMessages = [];

      for (const msg of messages.values()) {
        if (now - msg.createdTimestamp < fourteenDaysMs - 60000) {
          youngMessages.push(msg);
        } else {
          oldMessages.push(msg);
        }
      }

      // Bulk delete younger messages (instant)
      if (youngMessages.length > 0) {
        try {
          const deleted = await channel.bulkDelete(youngMessages, true);
          totalDeleted += deleted.size;
        } catch (bulkErr) {
          console.warn('[PURGE bulkDelete fallback]', bulkErr.message);
          for (const msg of youngMessages) {
            try {
              await msg.delete();
              totalDeleted++;
              await new Promise(r => setTimeout(r, 250));
            } catch {}
          }
        }
      }

      // Delete older messages one by one (bypasses 14-day Discord restriction)
      if (oldMessages.length > 0) {
        for (const msg of oldMessages) {
          try {
            await msg.delete();
            totalDeleted++;
            await new Promise(r => setTimeout(r, 250));
          } catch (delErr) {
            console.warn('[PURGE single delete err]', delErr.message);
          }
        }
      }

      // Short delay between batches to respect Discord rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error('[PURGE ERROR]', err.message);
      hasMore = false;
    }
  }

  console.log(`[PURGE] Finished! Total messages deleted: ${totalDeleted} in channel ${channel.id}`);
  return { deleted: totalDeleted };
}

module.exports = { purgeAllChannelMessages };
