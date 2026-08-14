const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');

const STAFF_KEYWORDS = ['staff', 'admin', 'mod', 'log', 'lead', 'command', 'ticket', 'dev', 'owner', 'private', 'exec', 'manage', 'audit', 'secret', 'bot-setup', 'high-rank'];
const VERIFIED_ROLE_IDS = ['1396299470244810942', '1399811369489928354'];
const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

function hasAdminBypass(memberOrUser, userId) {
  const userIdToCheck = userId || memberOrUser?.id;
  if (ADMIN_BYPASS_USERS.includes(userIdToCheck)) return true;
  const permissions = memberOrUser?.permissions;
  return permissions?.has(PermissionsBitField.Flags.Administrator) || permissions?.has(PermissionsBitField.Flags.ManageGuild) || false;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staff')
    .setDescription('Remove verified member role overwrites from staff and admin channels')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator | PermissionsBitField.Flags.ManageGuild),

  name: 'fixstaff',
  description: 'Remove verified member role overwrites from all staff and admin channels',

  async execute(interaction) {
    if (!hasAdminBypass(interaction.member, interaction.user.id)) {
      return interaction.reply({ content: '❌ Administrator permission required.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });
    const status = await interaction.editReply('🔒 Removing verified member roles from all staff channels...');
    const result = await fixStaffChannels(interaction.guild);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🛡️ Staff Channels Secured')
      .setDescription(`Successfully removed verified member roles from **${result.fixedCount}** staff/admin channels in **${interaction.guild.name}**.\n\nStaff channels are now completely hidden from regular verified users!`)
      .setTimestamp();

    await status.edit({ content: '', embeds: [embed] });
  },

  async prefixExecute(message, args, client) {
    if (!hasAdminBypass(message.member, message.author.id)) {
      return message.reply('❌ Administrator permission required.');
    }

    const statusMsg = await message.channel.send('🔒 Removing verified member roles from all staff channels...');
    const result = await fixStaffChannels(message.guild);

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🛡️ Staff Channels Secured')
      .setDescription(`Successfully removed verified member roles from **${result.fixedCount}** staff/admin channels in **${message.guild.name}**.\n\nStaff channels are now completely hidden from regular verified users!`)
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
    const verifiedRoles = guild.roles.cache.filter(r => 
      VERIFIED_ROLE_IDS.includes(r.id) ||
      r.name.toLowerCase() === 'verified' ||
      r.name.toLowerCase() === 'tmn verified' ||
      r.name.toLowerCase() === 'htb verified' ||
      r.name.toLowerCase() === 'tmn fam' ||
      r.name.toLowerCase() === 'htb fam' ||
      r.name.toLowerCase() === 'member'
    );

    const roleIdsToStrip = Array.from(verifiedRoles.keys());

    for (const channel of channels.values()) {
      if (!channel) continue;
      const name = (channel.name || '').toLowerCase();
      const parentName = (channel.parent?.name || '').toLowerCase();
      const isStaff = STAFF_KEYWORDS.some(k => name.includes(k) || parentName.includes(k));

      if (isStaff) {
        let channelModified = false;
        for (const rId of roleIdsToStrip) {
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
