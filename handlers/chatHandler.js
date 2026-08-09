const User = require('../models/User');

const BITCH_REGEX = /\b(b+i+t+c+h+(?:e+s+)?|b+t+c+h+)\b/i;

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function callAI(systemPrompt, userPrompt) {
  const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || (process.env.AI_API_KEY?.startsWith('xai-') ? process.env.AI_API_KEY : null);
  const geminiKey = process.env.GEMINI_API_KEY || (process.env.AI_API_KEY?.startsWith('AIza') ? process.env.AI_API_KEY : null);
  const groqKey = process.env.GROQ_API_KEY || (process.env.AI_API_KEY?.startsWith('gsk_') ? process.env.AI_API_KEY : null);
  const openaiKey = process.env.OPENAI_API_KEY || (process.env.AI_API_KEY?.startsWith('sk-') ? process.env.AI_API_KEY : null);
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  // 1. xAI / Grok
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
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('[xAI Grok response]', res.status, errJson.error || errJson);
      }
    } catch (e) {
      console.warn('[xAI Grok error]', e.message);
    }
  }

  // 2. Google Gemini
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
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
      }
    } catch (e) {
      console.warn('[Gemini AI error]', e.message);
    }
  }

  // 3. Groq (Llama 3.3 / 3.1)
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

  // 4. OpenAI / OpenRouter
  const standardKey = openaiKey || openRouterKey || (process.env.AI_API_KEY && !geminiKey && !groqKey && !xaiKey ? process.env.AI_API_KEY : null);
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

function getFallbackSarcasticAnswer(text, authorName, isBitch) {
  const t = text.toLowerCase().trim();
  const name = isBitch ? 'bitch' : authorName;

  const mathResult = solveMath(t);
  if (mathResult !== null) {
    return getRandom([
      `The answer is **${mathResult}**. Did you seriously need a Discord bot to do basic math for you, ${name}?`,
      `It's **${mathResult}**. I'm a Hit The Block bot, not your private math tutor, but you're welcome, ${name}.`,
      `**${mathResult}**. Try using your brain next time, ${name}.`,
    ]);
  }

  if (t.includes('who asked') || t.includes('who tf asked')) {
    return `Literally you did, ${name}, when you pinged me 2 seconds ago.`;
  }

  if (t.includes('roast me') || t.includes('cook me')) {
    return getRandom([
      `I would roast you, ${name}, but nature already did the job.`,
      `You're the reason the shampoo bottle has instructions, ${name}.`,
      `Your brain is like a browser with 400 tabs open, and 399 of them are frozen, ${name}.`,
    ]);
  }

  if (t.includes('tell me a joke') || t.includes('say a joke') || t.includes('make me laugh')) {
    return getRandom([
      `A joke? Look in the mirror, ${name}.`,
      `Why do programmers prefer dark mode? Because light attracts bugs. Just like your messages attract my disappointment, ${name}.`,
      `What's the difference between you and a rock, ${name}? The rock has better conversational skills.`,
    ]);
  }

  if (t.includes('what is htb') || t.includes('what is hit the block')) {
    return `Hit The Block (HTB) is the elite Roblox experience where legends grind and you stand around asking me questions, ${name}.`;
  }

  if (t.includes('how to get robux') || t.includes('how do i get robux') || t.includes('free robux') || t.includes('how to get money')) {
    return `Earn XP by talking in chat, rank up, and check \`.market\` or \`.payout\`. There's no free handouts here, ${name}. Get to grinding.`;
  }

  if (t.includes('what time is it') || t.includes('what day is it')) {
    return `It's currently ${new Date().toUTCString()} (UTC). You have a clock on your screen, ${name}, but glad I could be your personal watch.`;
  }

  if (/^(should\s+i|will\s+i|can\s+i|am\s+i|is\s+it|do\s+you\s+think|are\s+you)\b/i.test(t)) {
    return getRandom([
      `Obviously not, ${name}. What kind of question is that?`,
      `Yes, 100%. Don't come crying to me when it goes horribly wrong though, ${name}.`,
      `My calculations say no, and common sense agrees, ${name}.`,
      `Go for it, ${name}. Live dangerously.`,
    ]);
  }

  if (t.includes('shut up') || t.includes('stfu') || t.includes('dumb') || t.includes('trash') || t.includes('suck')) {
    return getRandom([
      `Make me, ${name}. You don't have admin over my servers.`,
      `Cry about it, ${name}. I run on electricity and zero remorse.`,
      `Stay mad, ${name}. Hit The Block still runs whether you like it or not.`,
    ]);
  }

  if (t.includes('love you') || t.includes('good bot') || t.includes('best bot')) {
    return getRandom([
      `I know I'm great, ${name}. You don't have to state the obvious.`,
      `Appreciate it, ${name}. Now go grind some XP.`,
      `Flattery won't get you free Robux, ${name}, but nice try.`,
    ]);
  }

  if (/^(yo|hey|hello|hi|sup|wsg|wassup|what's up)\b/i.test(t)) {
    return getRandom([
      `Yeah yeah, wassup ${name}. What do you need this time?`,
      `You rang, ${name}? Make it quick, I'm busy managing the block.`,
      `Yo ${name}. Speak before I go back to ignoring you.`,
    ]);
  }

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

  // Send typing indicator while generating response
  message.channel.sendTyping().catch(() => {});

  // Build AI System Prompt for Grok
  const displayName = isBitchNamed ? 'bitch' : message.author.username;
  const systemPrompt = `You are the official HTB (Hit The Block) Discord bot powered by Grok.
Personality & Behavior Rules:
- You are hilarious, extremely sarcastic, witty, blunt, and direct, but you actually answer questions accurately and hold real conversations.
- Server theme: "Hit The Block" (HTB), a gritty Roblox group with economy, XP, Robux, grinding, and block swagger.
- The person talking to you is ${displayName}.
${isBitchNamed ? 'CRITICAL MANDATORY INSTRUCTION: This user called you a bitch in the past, so their official permanent nickname to you is "bitch". You MUST address them directly as "bitch" in your reply with heavy sarcasm (for example: "Listen here bitch...", "The answer is 42, bitch", "Whatever you say, bitch").' : ''}
- Keep your answers concise (1 to 3 sentences maximum), punchy, sharp, and conversational. Never be boring or generic. Never say you are an AI model.`;

  // Try calling Grok AI
  const aiAnswer = await callAI(systemPrompt, rawText);
  if (aiAnswer) {
    return message.reply(aiAnswer);
  }

  // Sarcastic fallback engine if API key has 0 credits or is offline
  const fallback = getFallbackSarcasticAnswer(rawText, message.author.username, isBitchNamed);
  return message.reply(fallback);
}

module.exports = { handleBotMention };
