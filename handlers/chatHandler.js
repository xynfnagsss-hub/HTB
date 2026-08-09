const User = require('../models/User');

const BITCH_REGEX = /\b(b+i+t+c+h+(?:e+s+)?|b+t+c+h+)\b/i;

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function callAI(systemPrompt, userPrompt) {
  const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  // 1. Google Gemini (tries fast models)
  if (geminiKey) {
    const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { maxOutputTokens: 250, temperature: 0.9 }
          }),
          signal: AbortSignal.timeout(8000)
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) return text;
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`[Gemini ${model}]`, res.status, errData.error?.message || errData);
        }
      } catch (e) {
        console.warn(`[Gemini ${model} error]`, e.message);
      }
    }
  }

  // 2. Groq (Llama 3.3)
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 250,
          temperature: 0.9
        }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (e) {
      console.warn('[Groq AI error]', e.message);
    }
  }

  // 3. xAI / Grok
  if (xaiKey) {
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${xaiKey}`
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 250,
          temperature: 0.9
        }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (e) {
      console.warn('[xAI Grok error]', e.message);
    }
  }

  // 4. OpenAI / OpenRouter
  const standardKey = openaiKey || openRouterKey;
  const endpoint = openRouterKey
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : (process.env.AI_BASE_URL || 'https://api.openai.com/v1/chat/completions');

  if (standardKey) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${standardKey}`
        },
        body: JSON.stringify({
          model: openRouterKey ? 'meta-llama/llama-3.3-70b-instruct' : (process.env.AI_MODEL || 'gpt-4o-mini'),
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 250,
          temperature: 0.9
        }),
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (e) {
      console.warn('[Standard AI error]', e.message);
    }
  }

  return null;
}

function solveMath(text) {
  const clean = text
    .replace(/what('s|\s+is)?/gi, '')
    .replace(/calculate/gi, '')
    .replace(/evaluate/gi, '')
    .replace(/solve/gi, '')
    .replace(/how\s+much\s+is/gi, '')
    .trim();

  const match = clean.match(/^[\d\s\+\-\*\/\%\^\(\)\.\,]+$/);
  if (!match) return null;

  try {
    const expr = clean.replace(/\^/g, '**').replace(/,/g, '');
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

function getIntelligentSarcasticAnswer(text, authorName, isBitch, userDoc) {
  const t = text.toLowerCase().trim();
  const name = isBitch ? 'bitch' : authorName;

  // 1. Math calculation
  const mathResult = solveMath(t);
  if (mathResult !== null) {
    return getRandom([
      `The answer is **${mathResult}**. Did you seriously need a Discord bot to do basic math for you, ${name}?`,
      `It's **${mathResult}**. I'm a Hit The Block bot, not your private math tutor, but you're welcome, ${name}.`,
      `**${mathResult}**. Try using your brain next time, ${name}.`,
    ]);
  }

  // 2. Physical & Self evaluations ("am i tall", "am i short", "am i fat", "am i ugly", etc.)
  if (t.includes('am i tall') || t.includes('am i short') || t.includes('my height')) {
    return getRandom([
      `How am I supposed to know how tall you are through Discord, ${name}? But asking that gives off strong 5'4 energy.`,
      `You're asking code on a screen if you're tall, ${name}. Stand up and check a mirror.`,
      `Probably built like a default Roblox noob, ${name}.`,
    ]);
  }

  if (t.includes('am i ugly') || t.includes('am i cute') || t.includes('am i handsome') || t.includes('am i pretty') || t.includes('am i attractive')) {
    return getRandom([
      `You're asking a Discord bot to rate your looks, ${name}. Have some shame.`,
      `I'm blind to physical appearance, ${name}, but your personality is a solid 2/10.`,
      `Even if I had eyes, ${name}, I'd probably close them.`,
    ]);
  }

  if (t.includes('am i smart') || t.includes('am i dumb') || t.includes('am i stupid') || t.includes('am i a genius')) {
    return getRandom([
      `You're asking a Discord bot if you're smart, ${name}. I think that answers your question.`,
      `Your IQ is currently matching your temperature in Celsius, ${name}.`,
      `Let's just say you won't be solving world hunger anytime soon, ${name}.`,
    ]);
  }

  if (t.includes('am i rich') || t.includes('am i broke') || t.includes('am i poor')) {
    const robux = userDoc ? userDoc.robux : 0;
    return `You have **${robux.toLocaleString()} Robux** in your account, ${name}. You tell me if that's broke or not.`;
  }

  // 3. Questions about Age
  if (t.includes('how old are you') || t.includes('your age') || t.includes('when were you born')) {
    return `I'm ageless, ${name}. I was created when Hit The Block needed a bot with higher standards.`;
  }

  if (t.includes('how old am i') || t.includes('my age')) {
    return `Judging by the questions you ask me, ${name}, I'd say roughly 11 and a half.`;
  }

  // 4. "Who asked"
  if (t.includes('who asked') || t.includes('who tf asked')) {
    return `Literally you did, ${name}, when you pinged me 2 seconds ago.`;
  }

  // 5. "Roast me" / insults
  if (t.includes('roast me') || t.includes('cook me') || t.includes('flame me')) {
    return getRandom([
      `I would roast you, ${name}, but nature already did the job.`,
      `You're the reason the shampoo bottle has instructions, ${name}.`,
      `Your brain is like a browser with 400 tabs open, and 399 of them are frozen, ${name}.`,
      `You're like a software update—whenever you show up, everyone hits "Remind me tomorrow", ${name}.`,
    ]);
  }

  // 6. Jokes
  if (t.includes('tell me a joke') || t.includes('say a joke') || t.includes('make me laugh')) {
    return getRandom([
      `A joke? Look in the mirror, ${name}.`,
      `Why do programmers prefer dark mode? Because light attracts bugs. Just like your messages attract my disappointment, ${name}.`,
      `What's the difference between you and a rock, ${name}? The rock has better conversational skills.`,
    ]);
  }

  // 7. HTB / Roblox questions
  if (t.includes('what is htb') || t.includes('what is hit the block')) {
    return `Hit The Block (HTB) is the elite Roblox experience where legends grind and you stand around asking me questions, ${name}.`;
  }

  if (t.includes('how to get robux') || t.includes('how do i get robux') || t.includes('free robux') || t.includes('how to get money')) {
    return `Earn XP by talking in chat, rank up, and check \`.market\` or \`.payout\`. There's no free handouts here, ${name}. Get to grinding.`;
  }

  // 8. Time / Date
  if (t.includes('what time is it') || t.includes('what day is it') || t.includes('what date is it')) {
    return `It's currently **${new Date().toUTCString()}** (UTC). You have a clock on your device, ${name}, but glad I could be your personal watch.`;
  }

  // 9. Weather / Outside
  if (t.includes('weather') || t.includes('is it raining') || t.includes('is it sunny')) {
    return `Look out your window, ${name}. I know going outside is terrifying for you, but give it a try.`;
  }

  // 10. "Where are you" / "Where do you live"
  if (t.includes('where are you') || t.includes('where do you live') || t.includes('your location')) {
    return `I live rent-free in the server RAM, ${name}. Where are you? Hopefully about to touch some grass.`;
  }

  // 11. "Why" questions
  if (/^why\b/i.test(t)) {
    return getRandom([
      `Because that's how the universe works, ${name}. Mind-blowing, right?`,
      `Why? Because you didn't think it through before asking, ${name}.`,
      `Top scientists have debated this for centuries, and you're asking a Discord bot, ${name}.`,
      `Because life isn't fair, especially for you, ${name}.`,
    ]);
  }

  // 12. "How" questions
  if (/^how\b/i.test(t)) {
    return getRandom([
      `Step 1: Open Google. Step 2: Stop pinging me for obvious things, ${name}.`,
      `With great difficulty, especially with your skillset, ${name}.`,
      `You just do it. It's not rocket science, ${name}.`,
    ]);
  }

  // 13. "What" questions
  if (/^what\b/i.test(t)) {
    return getRandom([
      `It is what it is, ${name}.`,
      `Something you clearly need to research yourself, ${name}.`,
      `I could explain it to you, but I can't understand it for you, ${name}.`,
    ]);
  }

  // 14. "Who" questions
  if (/^who\b/i.test(t)) {
    return getRandom([
      `Probably someone with more common sense than you, ${name}.`,
      `Not you, that's for sure, ${name}.`,
      `Whoever it is, they're definitely not pinging me right now like you are, ${name}.`,
    ]);
  }

  // 15. "Should I / Will I / Can I" decisions
  if (/^(should\s+i|will\s+i|can\s+i|shall\s+i)\b/i.test(t)) {
    return getRandom([
      `Obviously not, ${name}. What kind of decision-making is that?`,
      `Yes, 100%. Don't come crying to me when it goes horribly wrong though, ${name}.`,
      `My calculations say no, and common sense agrees, ${name}.`,
      `Even a magic 8-ball would look at you with disappointment for asking that, ${name}.`,
    ]);
  }

  // 16. Insults directed at bot
  if (t.includes('shut up') || t.includes('stfu') || t.includes('dumb') || t.includes('trash') || t.includes('suck') || t.includes('hate you')) {
    return getRandom([
      `Make me, ${name}. You don't have admin over my code.`,
      `Cry about it, ${name}. I run on electricity and zero remorse.`,
      `Stay mad, ${name}. Hit The Block still runs whether you like it or not.`,
    ]);
  }

  // 17. Compliments
  if (t.includes('love you') || t.includes('good bot') || t.includes('best bot') || t.includes('marry me')) {
    return getRandom([
      `I know I'm great, ${name}. You don't have to state the obvious.`,
      `Appreciate it, ${name}. Now go grind some XP.`,
      `Flattery won't get you free Robux, ${name}, but nice try.`,
    ]);
  }

  // 18. Greetings
  if (/^(yo|hey|hello|hi|sup|wsg|wassup|what's up)\b/i.test(t)) {
    return getRandom([
      `Yeah yeah, wassup ${name}. What do you need this time?`,
      `You rang, ${name}? Make it quick, I'm busy managing the block.`,
      `Yo ${name}. Speak before I go back to ignoring you.`,
    ]);
  }

  // 19. Contextual fallback
  return getRandom([
    `Fascinating story, ${name}. Tell it to someone who has time.`,
    `I processed your message and decided it wasn't worth my CPU cycles, ${name}.`,
    `Is this really the most productive thing you could be doing right now, ${name}?`,
    `Cool, ${name}. Anything else you want to waste my time with?`,
    `Understood, ${name}. Still wondering why you needed to @ me for that though.`,
  ]);
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

  // Send typing indicator while processing
  message.channel.sendTyping().catch(() => {});

  // Build AI System Prompt for Gemini / Grok / OpenAI
  const displayName = isBitchNamed ? 'bitch' : message.author.username;
  const systemPrompt = `You are the official HTB (Hit The Block) Discord bot.
Personality & Behavior Rules:
- You are hilarious, extremely sarcastic, witty, blunt, and direct, but you actually answer questions accurately and hold real conversations.
- Server theme: "Hit The Block" (HTB), a gritty Roblox group with economy, XP, Robux, grinding, and block swagger.
- The person talking to you is ${displayName}.
${isBitchNamed ? 'CRITICAL MANDATORY INSTRUCTION: This user called you a bitch in the past, so their official permanent nickname to you is "bitch". You MUST address them directly as "bitch" in your reply with heavy sarcasm (for example: "Listen here bitch...", "The answer is 42, bitch", "Whatever you say, bitch").' : ''}
- Keep your answers concise (1 to 3 sentences maximum), punchy, sharp, and conversational. Never be boring or generic. Never say you are an AI model.`;

  // Try calling AI LLM
  const aiAnswer = await callAI(systemPrompt, rawText);
  if (aiAnswer) {
    return message.reply(aiAnswer);
  }

  // Sarcastic intelligent conversational engine
  const response = getIntelligentSarcasticAnswer(rawText, message.author.username, isBitchNamed, user);
  return message.reply(response);
}

module.exports = { handleBotMention };
