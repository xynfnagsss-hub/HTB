const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function buildSnipeEmbed(snipe, index, total) {
  return new EmbedBuilder()
    .setColor(0xff4444)
    .setTitle('🔍 Sniped Message')
    .setAuthor({ name: snipe.author, iconURL: snipe.authorAvatar || undefined })
    .setDescription(snipe.content)
    .setFooter({ text: `Message ${index + 1} of ${total} • Deleted at` })
    .setTimestamp(snipe.deletedAt);
}

function buildRow(index, total) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`snipe_prev_${index}`)
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId(`snipe_next_${index}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(index >= total - 1),
  );
}

module.exports = {
  name: 'snipe',
  description: 'Show or clear recently deleted messages in this channel',
  usage: '.snipe [clear]',

  async execute(message, args, client) {
    const sub = args[0] ? args[0].toLowerCase() : '';

    // Handle cache clearing: .snipe clear [all]
    if (sub === 'clear' || sub === 'clean' || sub === 'wipe' || sub === 'reset') {
      if (args[1] && args[1].toLowerCase() === 'all') {
        client.snipeStore.clear();
        return message.reply('🧹 **Server-wide snipe cache completely wiped!** All deleted messages have been cleared from memory.');
      }

      client.snipeStore.delete(message.channel.id);
      return message.reply('🧹 **Channel snipe cache wiped!** Deleted messages in this channel have been cleared.');
    }

    const snipes = client.snipeStore.get(message.channel.id);

    if (!snipes || snipes.length === 0) {
      return message.reply('❌ No recently deleted messages in this channel.');
    }

    const embed = buildSnipeEmbed(snipes[0], 0, snipes.length);
    const row = buildRow(0, snipes.length);

    await message.channel.send({ embeds: [embed], components: [row] });
  },

  async handleButton(interaction, client) {
    const parts = interaction.customId.split('_');
    const direction = parts[1]; // 'prev' or 'next'
    const currentIndex = parseInt(parts[2]);

    const snipes = client.snipeStore.get(interaction.channel.id);

    if (!snipes || snipes.length === 0) {
      return interaction.update({ content: '❌ No snipe data available anymore.', embeds: [], components: [] });
    }

    let newIndex = currentIndex;
    if (direction === 'next') newIndex = Math.min(currentIndex + 1, snipes.length - 1);
    if (direction === 'prev') newIndex = Math.max(currentIndex - 1, 0);

    const embed = buildSnipeEmbed(snipes[newIndex], newIndex, snipes.length);
    const row = buildRow(newIndex, snipes.length);

    await interaction.update({ embeds: [embed], components: [row] });
  },
};
