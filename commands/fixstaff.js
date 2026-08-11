const { PermissionsBitField, EmbedBuilder } = require('discord.js');

const STAFF_KEYWORDS = ['staff', 'admin', 'mod', 'log', 'lead', 'command', 'ticket', 'dev', 'owner', 'private', 'exec', 'manage', 'audit', 'secret', 'bot-setup', 'high-rank'];
const VERIFIED_ROLE_IDS = ['1396299470244810942', '1399811369489928354'];
const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

module.exports = {
  name: 'fixstaff',
  description: 'Remove verified member role overwrites from all staff and admin channels',
  async execute(message, args) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Administrator permission required.');
    }

    const statusMsg = await message.channel.send('🔒 Removing verified member roles from all staff channels...');
    const result = await fixStaffChannels(message.guild);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🛡️ Staff Channels Secured')
      .setDescription(`Successfully removed verified member roles from **${result.fixedCount}** staff/admin channels.\n\nStaff channels are now completely hidden from regular verified users!`)
      .setTimestamp();

    await statusMsg.edit({ content: '', embeds: [embed] });
  },
  fixStaffChannels,
};

async function fixStaffChannels(guild) {
  if (!guild) return { fixedCount: 0 };
  let fixedCount = 0;

  try {
    const channels = await guild.channels.fetch();
    for (const channel of channels.values()) {
      if (!channel) continue;
      const name = (channel.name || '').toLowerCase();
      const parentName = (channel.parent?.name || '').toLowerCase();
      const isStaff = STAFF_KEYWORDS.some(k => name.includes(k) || parentName.includes(k));

      if (isStaff) {
        let channelModified = false;
        for (const rId of VERIFIED_ROLE_IDS) {
          try {
            await channel.permissionOverwrites.delete(rId, 'Hide staff channel from verified members');
            channelModified = true;
          } catch {}
        }
        if (channelModified) fixedCount++;
      }
    }
  } catch (err) {
    console.error('[fixStaffChannels Error]:', err);
  }

  return { fixedCount };
}
