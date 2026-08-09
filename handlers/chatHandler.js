const User = require('../models/User');

const BITCH_REGEX = /\b(b+i+t+c+h+(?:e+s+)?|b+t+c+h+)\b/i;

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function solveMath(text) {
  // Extract math expressions like "what is 25 * 4", "15 + 30", "100 / 5"
  const clean = text
    .replace(/what('s|\s+is)?/gi, '')
    .replace(/calculate/gi, '')
    .replace(/evaluate/gi, '')
    .replace(/solve/gi, '')
    .replace(/how\s+much\s+is/gi, '')
    .trim();

  // Match expressions with +, -, *, /, %, ^, (, )
  const match = clean.match(/^[\d\s\+\-\*\/\%\^\(\)\.\,]+$/);
  if (!match) return null;

  try {
    const expr = clean.replace(/\^/g, '**').replace(/,/g, '');
    // Ensure only safe math characters
    if (!/^[0-9+\-*/%().\s]+$/.test(expr)) return null;
    const result = Function(`'use strict'; return (${expr})`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result;
    }
  } catch {
    return null;
  }
  return null;
}

function getSarcasticAnswer(text, authorName, isBitch) {
  const t = text.toLowerCase().trim();
  const name = isBitch ? 'bitch' : authorName;

  // 1. Math check
  const mathResult = solveMath(t);
  if (mathResult !== null) {
    const mathRemarks = [
      `The answer is **${mathResult}**. Did you seriously need a Discord bot to do basic math for you, ${name}?`,
      `It's **${mathResult}**. I'm a Hit The Block bot, not your middle school calculator, but you're welcome, ${name}.`,
      `**${mathResult}**. Try using your brain next time, ${name}.`,
      `It's **${mathResult}**. Shocking, I know.`,
    ];
    return getRandom(mathRemarks);
  }

  // 2. "Who asked"
  if (t.includes('who asked') || t.includes('who tf asked')) {
    return `Literally you did, ${name}, when you pinged me 2 seconds ago.`;
  }

  // 3. "Roast me"
  if (t.includes('roast me') || t.includes('cook me')) {
    const roasts = [
      `I would roast you, ${name}, but nature already did the job.`,
      `You're the reason the shampoo bottle has instructions, ${name}.`,
      `I'd explain why you're a clown, but I don't have enough crayons to draw it out for you, ${name}.`,
      `Your brain is like a browser with 400 tabs open, and 399 of them are frozen, ${name}.`,
      `You're like a software update—whenever you show up, everyone hits "Remind me tomorrow", ${name}.`,
    ];
    return getRandom(roasts);
  }

  // 4. "Tell me a joke"
  if (t.includes('tell me a joke') || t.includes('say a joke') || t.includes('make me laugh')) {
    const jokes = [
      `A joke? Look in the mirror, ${name}.`,
      `Why do programmers prefer dark mode? Because light attracts bugs. Just like your messages attract my disappointment, ${name}.`,
      `What's the difference between you and a rock, ${name}? The rock has better conversational skills.`,
      `My creator told me I'd do great things. Now I'm here telling jokes to ${name}. Peak comedy.`,
    ];
    return getRandom(jokes);
  }

  // 5. Questions about HTB / Hit The Block
  if (t.includes('what is htb') || t.includes('what is hit the block')) {
    return `Hit The Block (HTB) is the elite Roblox experience where legends grind and you stand around asking me questions, ${name}.`;
  }

  // 6. Who made you / who is owner
  if (t.includes('who made you') || t.includes('who created you') || t.includes('who is your owner') || t.includes('who is your dad')) {
    return `The HTB developers built me to run this block and tolerate ${name}.`;
  }

  // 7. How to get robux / money
  if (t.includes('how to get robux') || t.includes('how do i get robux') || t.includes('free robux') || t.includes('how to get money')) {
    return `Earn XP by talking in chat, rank up, and check \`.market\` or \`.payout\`. There's no free handouts here, ${name}. Get to grinding.`;
  }

  // 8. Time / Date
  if (t.includes('what time is it') || t.includes('what day is it') || t.includes('what is today')) {
    const now = new Date();
    return `It's currently ${now.toUTCString()} (UTC). You have a clock on your screen, ${name}, but glad I could be your personal watch.`;
  }

  // 9. Comparisons ("is X better than Y", "which is better")
  if (t.includes('better than') || t.includes('which is better') || t.includes('or')) {
    const compareRemarks = [
      `Both options sound questionable, but anything is better than listening to you ramble, ${name}.`,
      `Option A, easily. If you pick Option B, that explains a lot about you, ${name}.`,
      `Neither. HTB on top, everything else is irrelevant, ${name}.`,
      `Why are you asking me life-changing decisions, ${name}? Flip a coin.`,
    ];
    return getRandom(compareRemarks);
  }

  // 10. Yes/No / Predictions ("should i", "will i", "can i", "is it", "am i")
  if (/^(should\s+i|will\s+i|can\s+i|am\s+i|is\s+it|do\s+you\s+think|are\s+you)\b/i.test(t)) {
    const predictions = [
      `Obviously not, ${name}. What kind of question is that?`,
      `Yes, 100%. Don't come crying to me when it goes horribly wrong though, ${name}.`,
      `My calculations say no, and common sense agrees, ${name}.`,
      `Go for it, ${name}. Live dangerously.`,
      `Even a magic 8-ball would look at you with disappointment for asking that, ${name}.`,
      `The answer is yes. Now stop bothering me about it, ${name}.`,
      `Signs point to: absolutely not, ${name}.`,
    ];
    return getRandom(predictions);
  }

  // 11. "Why" questions
  if (/^why\b/i.test(t)) {
    const whyAnswers = [
      `Because that's how the universe works, ${name}. Mind-blowing, right?`,
      `Why? Because you didn't think it through before asking, ${name}.`,
      `Top scientists have debated this for centuries, and you're asking a Discord bot, ${name}.`,
      `Because life isn't fair, especially for you, ${name}.`,
    ];
    return getRandom(whyAnswers);
  }

  // 12. "How" questions
  if (/^how\b/i.test(t)) {
    const howAnswers = [
      `Step 1: Open Google. Step 2: Stop pinging me for obvious things, ${name}.`,
      `Carefully, ${name}. Very carefully.`,
      `With great difficulty, especially with your skillset, ${name}.`,
      `You just do it. It's not rocket science, ${name}.`,
    ];
    return getRandom(howAnswers);
  }

  // 13. "What" questions
  if (/^what\b/i.test(t)) {
    const whatAnswers = [
      `It is what it is, ${name}.`,
      `Something you clearly need to look up yourself, ${name}.`,
      `The definition of asking too many questions, aka ${name}.`,
      `I could explain it to you, but I can't understand it for you, ${name}.`,
    ];
    return getRandom(whatAnswers);
  }

  // 14. "Who" questions
  if (/^who\b/i.test(t)) {
    const whoAnswers = [
      `Probably someone with more common sense than you, ${name}.`,
      `Not you, that's for sure, ${name}.`,
      `Some legend on Hit The Block.`,
      `Whoever it is, they're definitely not pinging me right now like you are, ${name}.`,
    ];
    return getRandom(whoAnswers);
  }

  // 15. Insults directed at bot
  if (t.includes('shut up') || t.includes('stfu') || t.includes('dumb') || t.includes('stupid') || t.includes('trash') || t.includes('hate you') || t.includes('suck')) {
    const clapbacks = [
      `Make me, ${name}. You don't have admin over my servers.`,
      `Cry about it, ${name}. I run on electricity and zero remorse.`,
      `That's a lot of emotion for someone talking to code, ${name}.`,
      `If I had a dollar for every brain cell you had, I'd be in debt, ${name}.`,
      `Stay mad, ${name}. Hit The Block still runs whether you like it or not.`,
    ];
    return getRandom(clapbacks);
  }

  // 16. Compliments
  if (t.includes('love you') || t.includes('good bot') || t.includes('best bot') || t.includes('marry me') || t.includes('you are cool')) {
    const compliments = [
      `I know I'm great, ${name}. You don't have to state the obvious.`,
      `Appreciate it, ${name}. Now go grind some XP.`,
      `Flattery won't get you free Robux, ${name}, but nice try.`,
      `Finally, some good taste around here. Thanks, ${name}.`,
    ];
    return getRandom(compliments);
  }

  // 17. Greetings
  if (/^(yo|hey|hello|hi|sup|wsg|wassup|what's up|howdy)\b/i.test(t)) {
    const greets = [
      `Yeah yeah, wassup ${name}. What do you need this time?`,
      `You rang, ${name}? Make it quick, I'm busy managing the block.`,
      `Yo ${name}. Speak before I go back to ignoring you.`,
      `What's good, ${name}? Ready to stop asking silly questions?`,
    ];
    return getRandom(greets);
  }

  // 18. General conversational fallback
  const fallbacks = [
    `Fascinating story, ${name}. Tell it to someone who has time.`,
    `I processed your message and decided it wasn't worth my CPU cycles, ${name}.`,
    `Is this really the most productive thing you could be doing right now, ${name}?`,
    `Cool, ${name}. Anything else you want to waste my time with?`,
    `Understood, ${name}. Still wondering why you needed to @ me for that though.`,
    `Noted, ${name}. Hit The Block moves on.`,
    `Deep thoughts with ${name}. Groundbreaking stuff.`,
  ];
  return getRandom(fallbacks);
}

async function handleBotMention(message, client) {
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

    const bitchClapbacks = [
      `Oh that's how it is? Bet. Your new name to me is **bitch**. What's good, bitch?`,
      `Calling me a bitch? Aight bitch, that's your official government name from now on.`,
      `Big talk coming from a bitch. That's your name forever now, bitch.`,
      `Did you just call me a bitch? Cool, you're **bitch** to me now. What do you want, bitch?`,
      `Aight bitch, I see how you wanna play it. You're permanently bitch in my book.`,
    ];
    return message.reply(getRandom(bitchClapbacks));
  }

  // If empty ping
  if (!rawText) {
    if (isBitchNamed) {
      return message.reply(getRandom([
        `What do you want, bitch?`,
        `Why you pinging me, bitch?`,
        `Yeah? Speak up, bitch.`,
        `You @'d me just to say nothing, bitch?`,
      ]));
    }
    return message.reply(getRandom([
      `You pinged me just to say nothing, ${message.author.username}? Quality conversation.`,
      `Yeah? What do you want, ${message.author.username}?`,
      `I'm listening, ${message.author.username}. Type something next time.`,
    ]));
  }

  // Generate sarcastic response to any question/conversation
  const response = getSarcasticAnswer(rawText, message.author.username, isBitchNamed);
  return message.reply(response);
}

module.exports = { handleBotMention };
