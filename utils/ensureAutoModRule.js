const { AutoModRuleEventType, AutoModRuleTriggerType, AutoModActionType, PermissionsBitField } = require('discord.js');

const PROTECTED_USER_IDS = ['674218467041345536', '1508174981396168755'];
const RULE_NAME = 'HTB Anti-Ping Protection';

async function ensureNativeAutoModRule(guild) {
  if (!guild) return { success: false, reason: 'Invalid guild' };

  const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!botMember) return { success: false, reason: 'Bot member not found' };

  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageGuild) && !botMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
    console.warn(`[AutoMod] Bot lacks Manage Server (ManageGuild) permission in ${guild.name} to create native AutoMod rules.`);
    return { success: false, reason: 'Missing Manage Server permission' };
  }

  try {
    const existingRules = await guild.autoModRules.fetch().catch(() => null);
    const existing = existingRules?.find(r => r.name === RULE_NAME);

    const keywordPatterns = [];
    const regexPatterns = [];

    for (const id of PROTECTED_USER_IDS) {
      keywordPatterns.push(`*${id}*`);
      regexPatterns.push(`<@!?${id}>`);
    }

    if (!existing) {
      await guild.autoModRules.create({
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
      return { success: true, action: 'created' };
    } else {
      await existing.edit({
        enabled: true,
        triggerMetadata: {
          keywordFilter: keywordPatterns,
          regexPatterns: regexPatterns,
        },
      });
      console.log(`🛡️ Updated native Discord AutoMod Anti-Ping Rule in guild: ${guild.name}`);
      return { success: true, action: 'updated' };
    }
  } catch (err) {
    console.error(`[AutoMod Rule Error in ${guild.name}]:`, err.message);
    return { success: false, reason: err.message };
  }
}

module.exports = { ensureNativeAutoModRule, PROTECTED_USER_IDS };
