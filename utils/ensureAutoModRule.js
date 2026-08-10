const { AutoModRuleEventType, AutoModRuleTriggerType, AutoModActionType, PermissionsBitField } = require('discord.js');

const PROTECTED_USER_ID = '674218467041345536';
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

    const keywordPatterns = [
      `*<@${PROTECTED_USER_ID}>*`,
      `*<@!${PROTECTED_USER_ID}>*`,
      `*${PROTECTED_USER_ID}*`,
    ];

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
              customMessage: 'You cannot ping or mention this user. Messages mentioning him are automatically blocked.',
            },
          },
        ],
        enabled: true,
        reason: 'Block all incoming pings and mentions before they trigger Discord notifications',
      });
      console.log(`🛡️ Created native Discord AutoMod Anti-Ping Rule in guild: ${guild.name}`);
    } else if (!existing.enabled) {
      await existing.edit({ enabled: true });
    }
  } catch (err) {
    console.warn(`[AutoMod Rule Warning in ${guild.name}]:`, err.message);
  }
}

module.exports = { ensureNativeAutoModRule };
