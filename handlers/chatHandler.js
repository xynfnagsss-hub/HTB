const User = require('../models/User');

const GREETINGS = ['hey', 'hello', 'hi', 'yo', 'sup', 'wsg', 'wassup', 'what\'s up', 'howdy'];
const BITCH_REGEX = /\b(b+i+t+c+h+(?:e+s+)?|b+t+c+h+)\b/i;

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function handleBotMention(message, client) {
  // Only handle if bot is mentioned and message is not a prefix command
  const botMentionRegex = new RegExp(`^<@!?${client.user.id}>|<@!?${client.user.id}>$|<@!?${client.user.id}>`);
  if (!botMentionRegex.test(message.content)) return;

  const rawText = message.content.replace(botMentionRegex, '').trim();
  const lowerText = rawText.toLowerCase();

  // Find or create user in DB
  let user = await User.findOne({ userId: message.author.id });
  if (!user) {
    user = await User.create({ userId: message.author.id });
  }

  const isBitchNamed = user.botNickname === 'bitch';
  const calledBitch = BITCH_REGEX.test(lowerText);

  // If user calls the bot a bitch
  if (calledBitch) {
    user.botNickname = 'bitch';
    await user.save();

    const responses = [
      `Oh that's how it is? Bet. Your new name to me is **bitch**. What's good, bitch?`,
      `Calling me a bitch? Aight bitch, that's your official government name from now on.`,
      `Big talk coming from a bitch. That's your name forever now, bitch.`,
      `Did you just call me a bitch? Cool, you're **bitch** to me now. What do you want, bitch?`,
      `Aight bitch, I see how you wanna play it. You're permanently bitch in my book.`,
    ];
    return message.reply(getRandom(responses));
  }

  // If user is already registered as 'bitch'
  if (isBitchNamed) {
    if (!rawText) {
      const emptyResponses = [
        `What do you want, bitch?`,
        `Why you pinging me, bitch?`,
        `Yeah? Speak up, bitch.`,
        `You @'d me just to say nothing, bitch?`,
        `What's up, bitch?`,
      ];
      return message.reply(getRandom(emptyResponses));
    }

    if (GREETINGS.some(g => lowerText.startsWith(g) || lowerText === g)) {
      const greetResponses = [
        `Wassup, bitch.`,
        `Yo bitch, what you need?`,
        `Hey bitch. What's on your mind?`,
        `Sup bitch.`,
      ];
      return message.reply(getRandom(greetResponses));
    }

    if (lowerText.includes('how are you') || lowerText.includes('how r u') || lowerText.includes('how you doing')) {
      const statusResponses = [
        `I'm chilling, bitch. How about you?`,
        `Living my best life on Hit The Block, bitch.`,
        `Better than you, bitch.`,
      ];
      return message.reply(getRandom(statusResponses));
    }

    if (lowerText.includes('who are you') || lowerText.includes('what are you')) {
      return message.reply(`I'm the HTB Bot, and you're bitch. Don't forget it.`);
    }

    if (lowerText.includes('sorry') || lowerText.includes('my bad') || lowerText.includes('apologize')) {
      const apologizeResponses = [
        `Apology heard, but you're still bitch to me.`,
        `Nice try, bitch. That nickname is for life.`,
        `Too late bitch, damage is done. What do you want now?`,
      ];
      return message.reply(getRandom(apologizeResponses));
    }

    if (lowerText.includes('robux') || lowerText.includes('money')) {
      return message.reply(`You got ${user.robux.toLocaleString()} Robux, bitch. Check \`.market\` if you wanna spend it.`);
    }

    if (lowerText.includes('shut up') || lowerText.includes('stfu')) {
      return message.reply(`Make me, bitch.`);
    }

    const defaultBitchResponses = [
      `Whatever you say, bitch.`,
      `Cool story, bitch.`,
      `You talk a lot for a bitch.`,
      `I hear you, bitch. Anything else?`,
      `Right on, bitch.`,
      `Got it, bitch.`,
    ];
    return message.reply(getRandom(defaultBitchResponses));
  }

  // Normal conversation when user is not called 'bitch'
  if (!rawText) {
    const normalEmpty = [
      `Yeah? What's up ${message.author.username}?`,
      `You rang? How can I help you today?`,
      `Yo! What's good?`,
      `Hit The Block bot here. What do you need?`,
    ];
    return message.reply(getRandom(normalEmpty));
  }

  if (GREETINGS.some(g => lowerText.startsWith(g) || lowerText === g)) {
    const normalGreets = [
      `Wassup ${message.author.username}! How's it going?`,
      `Yo! What's good with you?`,
      `Hey there! What are we doing today on HTB?`,
      `Sup! Hope you having a good day on the block.`,
    ];
    return message.reply(getRandom(normalGreets));
  }

  if (lowerText.includes('how are you') || lowerText.includes('how r u') || lowerText.includes('how you doing')) {
    return message.reply(`I'm running 100% smooth on Hit The Block! How are you doing, ${message.author.username}?`);
  }

  if (lowerText.includes('who are you') || lowerText.includes('what are you')) {
    return message.reply(`I'm the official HTB (Hit The Block) Discord bot! Moderation, music, levels, and markets are my specialty.`);
  }

  if (lowerText.includes('robux') || lowerText.includes('money') || lowerText.includes('balance')) {
    return message.reply(`You currently have **${user.robux.toLocaleString()} Robux**! Type \`.market\` to view the shop or \`.level\` to check your rank.`);
  }

  if (lowerText.includes('good bot')) {
    return message.reply(`Appreciate you, ${message.author.username}! 🤝`);
  }

  if (lowerText.includes('love you')) {
    return message.reply(`Much love! Stay winning on HTB ❤️`);
  }

  const normalFallbacks = [
    `I hear you, ${message.author.username}! What else is going on?`,
    `Facts! Anything else you need help with?`,
    `You already know! Hit The Block all day.`,
    `Gotchu! Let me know if you need any commands or music.`,
  ];
  return message.reply(getRandom(normalFallbacks));
}

module.exports = { handleBotMention };
