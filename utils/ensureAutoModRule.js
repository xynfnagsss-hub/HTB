const {
  PermissionsBitField,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  AutoModerationActionType,
} = require('discord.js');

const DEFAULT_PROTECTED_USER_IDS = ['674218467041345536'];
const RULE_NAME = 'TNM Anti-Ping Protection';

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

    const keywordFilter = [
      '<@674218467041345536>',
      '<@!674218467041345536>',
      '*674218467041345536*',
    ];

    const ruleData = {
      name: RULE_NAME,
      eventType: AutoModerationRuleEventType.MessageSend,
      triggerType: AutoModerationRuleTriggerType.Keyword,
      triggerMetadata: {
        keywordFilter,
      },
      actions: [
        {
          type: AutoModerationActionType.BlockMessage,
          metadata: {
            customMessage: '⛔ You are not allowed to ping or mention server owners/administrators.',
          },
        },
      ],
      enabled: true,
      exemptRoles: [],
      exemptChannels: [],
    };

    if (existing) {
      await existing.edit(ruleData);
      console.log(`🛡️ Updated native Discord AutoMod rule in ${guild.name}`);
    } else {
      await manager.create(ruleData);
      console.log(`🛡️ Created native Discord AutoMod rule in ${guild.name}`);
    }

    return { success: true };
  } catch (err) {
    console.error('[AutoMod Rule Err]:', err.message);
    return { success: false, reason: err.message };
  }
}

module.exports = { ensureNativeAutoModRule, DEFAULT_PROTECTED_USER_IDS };
