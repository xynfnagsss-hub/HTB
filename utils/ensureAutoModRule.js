const {
  PermissionsBitField
} = require('discord.js');

const DEFAULT_PROTECTED_USER_IDS = ['674218467041345536', '1508174981396168755'];
const RULE_NAME = 'HTB Anti-Ping Protection';

async function ensureNativeAutoModRule(guild) {
  if (!guild) return { success: false, reason: 'Invalid guild' };

  const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!botMember) return { success: false, reason: 'Bot member not found' };

  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageGuild) && !botMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return { success: false, reason: 'Bot missing ManageGuild permission' };
  }

  const manager = guild.autoModerationRules;
  if (!manager) return { success: false, reason: 'AutoMod not supported' };

  try {
    const existingRules = await manager.fetch().catch(() => null);
    const existing = existingRules?.find(r => r.name === RULE_NAME);

    // If an old native rule exists that was blocking replies, remove it so replies work 100%
    if (existing) {
      await existing.delete().catch(() => {});
      console.log(`🛡️ Cleaned up native AutoMod rule in ${guild.name} to allow message replies.`);
    }

    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

module.exports = { ensureNativeAutoModRule, DEFAULT_PROTECTED_USER_IDS };
