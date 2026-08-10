const { AutoModRuleEventType, AutoModRuleTriggerType, AutoModActionType, PermissionsBitField } = require('discord.js');

const DEFAULT_PROTECTED_USER_IDS = ['674218467041345536', '1508174981396168755'];
const RULE_NAME = 'HTB Anti-Ping Protection';

async function ensureNativeAutoModRule(guild, extraUserIds = []) {
  if (!guild) return { success: false, reason: 'Invalid guild' };

  const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!botMember) return { success: false, reason: 'Bot member not found' };

  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageGuild) && !botMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
    console.warn(`[AutoMod] Bot lacks Manage Server (ManageGuild) permission in ${guild.name} to create native AutoMod rules.`);
    return { success: false, reason: 'Bot missing "Manage Server" (ManageGuild) permission' };
  }

  const manager = guild.autoModerationRules;
  if (!manager) {
    return { success: false, reason: 'AutoModerationRules manager not supported in this guild' };
  }

  try {
    const existingRules = await manager.fetch().catch(() => null);
    const existing = existingRules?.find(r => r.name === RULE_NAME);

    const allIds = Array.from(new Set([...DEFAULT_PROTECTED_USER_IDS, ...extraUserIds]));
    const keywordPatterns = [];
    const regexPatterns = [];

    for (const id of allIds) {
      keywordPatterns.push(`*${id}*`);
      regexPatterns.push(`<@!?${id}>`);
    }

    if (!existing) {
      await manager.create({
        name: RULE_NAME,
        eventType: AutoModRuleEventType.MessageSend,
        triggerType: AutoModRuleTriggerType.Keyword,
        triggerMetadata: {
          keywordFilter: keywordPatterns,
          regexPatterns: regexPatterns,
        },
        actions: [
          {
            type: AutoModActionType.BlockMessage,
            metadata: {
              customMessage: 'You are not allowed to ping or mention this user.',
            },
          },
        ],
        enabled: true,
        reason: 'Block all incoming pings and mentions before they trigger Discord notifications',
      });
      console.log(`🛡️ Successfully created native Discord AutoMod Anti-Ping Rule in guild: ${guild.name}`);
      return { success: true, action: 'created', protectedIds: allIds };
    } else {
      await existing.edit({
        enabled: true,
        triggerMetadata: {
          keywordFilter: keywordPatterns,
          regexPatterns: regexPatterns,
        },
      });
      console.log(`🛡️ Updated native Discord AutoMod Anti-Ping Rule in guild: ${guild.name}`);
      return { success: true, action: 'updated', protectedIds: allIds };
    }
  } catch (err) {
    console.error(`[AutoMod Rule Error in ${guild.name}]:`, err.message);
    return { success: false, reason: err.message };
  }
}

module.exports = { ensureNativeAutoModRule, DEFAULT_PROTECTED_USER_IDS };
