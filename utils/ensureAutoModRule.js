const { AutoModRuleEventType, AutoModRuleTriggerType, AutoModActionType, PermissionsBitField } = require('discord.js');

const PROTECTED_USER_IDS = ['674218467041345536', '1508174981396168755'];
const RULE_NAME = 'HTB Anti-Ping Protection';

async function ensureNativeAutoModRule(guild) {
  if (!guild) return;

  const botMember = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!botMember || !botMember.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    return;
  }

  try {
    const existingRules = await guild.autoModRules.fetch().catch(() => null);
    const existing = existingRules?.find(r => r.name === RULE_NAME);

    const keywordPatterns = [];
    for (const id of PROTECTED_USER_IDS) {
      keywordPatterns.push(`*<@${id}>*`, `*<@!${id}>*`, `*${id}*`);
    }

    if (!existing) {
      await guild.autoModRules.create({
        name: RULE_NAME,
        eventType: AutoModRuleEventType.MessageSend,
        triggerType: AutoModRuleTriggerType.Keyword,
        triggerMetadata: {
          keywordFilter: keywordPatterns,
        },
        actions: [
          {
            type: AutoModActionType.BlockMessage,
            metadata: {
              customMessage: 'You cannot ping or mention this user. Messages mentioning them are automatically blocked.',
            },
          },
        ],
        enabled: true,
        reason: 'Block all incoming pings and mentions before they trigger Discord notifications',
      });
      console.log(`🛡️ Created native Discord AutoMod Anti-Ping Rule in guild: ${guild.name}`);
    } else {
      // Update existing rule to ensure all protected user patterns are present
      await existing.edit({
        enabled: true,
        triggerMetadata: {
          keywordFilter: keywordPatterns,
        },
      }).catch(() => {});
    }
  } catch (err) {
    console.warn(`[AutoMod Rule Warning in ${guild.name}]:`, err.message);
  }
}

module.exports = { ensureNativeAutoModRule, PROTECTED_USER_IDS };
