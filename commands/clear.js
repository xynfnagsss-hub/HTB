const { SlashCommandBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const { purgeAllChannelMessages } = require('../utils/purgeChannel');

const ADMIN_BYPASS_USERS = ['1508174981396168755', '674218467041345536'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete messages from this channel (including old messages)')
    .addIntegerOption(opt =>
      opt.setName('amount').setDescription('Number of messages to delete (1-100), or leave empty to delete all').setRequired(false).setMinValue(1).setMaxValue(100))
    .addBooleanOption(opt =>
      opt.setName('all').setDescription('Delete ALL messages in this channel').setRequired(false))
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Specific channel to clear').addChannelTypes(ChannelType.GuildText).setRequired(false))
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  async execute(interaction) {
    const isBypass = ADMIN_BYPASS_USERS.includes(interaction.user.id);
    if (!isBypass && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: '❌ You do not have permission to manage messages.', ephemeral: true });
    }

    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    const amount = interaction.options.getInteger('amount');
    const clearAll = interaction.options.getBoolean('all');

    await interaction.deferReply({ ephemeral: true });

    try {
      if (clearAll || !amount) {
        await interaction.editReply({ content: `🧹 Purging all messages in <#${targetChannel.id}>... This may take a moment.` });
        const res = await purgeAllChannelMessages(targetChannel);
        await interaction.editReply({ content: `✅ Complete! Purged **${res.deleted}** message(s) from <#${targetChannel.id}>.` });
      } else {
        const deleted = await targetChannel.bulkDelete(amount, true);
        await interaction.editReply({ content: `🗑️ Deleted **${deleted.size}** message(s) from <#${targetChannel.id}>.` });
      }
    } catch (err) {
      console.error('[CLEAR ERROR]', err);
      await interaction.editReply({ content: `❌ Error deleting messages: \`${err.message}\`` });
    }
  },

  async prefixExecute(message, args, client) {
    const isBypass = ADMIN_BYPASS_USERS.includes(message.author.id);
    if (!isBypass && !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply('❌ You do not have permission to manage messages.');
    }

    let targetChannel = message.channel;
    let amount = null;
    let clearAll = false;

    if (args.length > 0) {
      const first = args[0].toLowerCase();
      const channelMention = message.mentions.channels.first() || client.channels.cache.get(args[0]);

      if (channelMention) {
        targetChannel = channelMention;
        const second = args[1]?.toLowerCase();
        if (second === 'all') {
          clearAll = true;
        } else if (!isNaN(second)) {
          amount = parseInt(second, 10);
        } else {
          clearAll = true;
        }
      } else if (first === 'all' || first === 'everything') {
        clearAll = true;
      } else if (!isNaN(first)) {
        amount = parseInt(first, 10);
      }
    } else {
      clearAll = true;
    }

    const statusMsg = await message.channel.send(`🧹 Deleting messages in <#${targetChannel.id}>...`);

    try {
      if (clearAll || !amount) {
        const res = await purgeAllChannelMessages(targetChannel);
        await statusMsg.edit(`✅ Successfully deleted **${res.deleted}** message(s) from <#${targetChannel.id}>.`);
      } else {
        const deleted = await targetChannel.bulkDelete(amount, true);
        await statusMsg.edit(`🗑️ Deleted **${deleted.size}** message(s).`);
      }
    } catch (err) {
      console.error('[PREFIX CLEAR ERROR]', err);
      statusMsg.edit(`❌ Error deleting messages: \`${err.message}\``).catch(() => {});
    }
  }
};
