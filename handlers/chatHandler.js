const https = require('https');
const User = require('../models/User');

const BITCH_REGEX = /\b(b+i+t+c+h+(?:e+s+)?|b+t+c+h+)\b/i;

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function httpsPost(urlStr, headers, bodyObj, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const postData = JSON.stringify(bodyObj);
      const req = https.request({
        hostname: u.hostname,
        port: u.port || 443,
        path: u.pathname + u.search,
        method: 'POST',
        family: 4,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          ...headers,
        },
        timeout: timeoutMs,
      }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, data: json });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request to ${u.hostname} timed out`));
      });

      req.write(postData);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

async function callAI(systemPrompt, userPrompt) {
  const groqKey = process.env.GROQ_API_KEY || (process.env.AI_API_KEY?.startsWith('gsk_') ? process.env.AI_API_KEY : null);
  const xaiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  // 1. Groq (Fast Llama 3.3 70B)
  if (groqKey) {
    try {
      const res = await httpsPost('https://api.groq.com/openai/v1/chat/completions', {
        'Authorization': `Bearer ${groqKey}`,
      }, {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 250,
        temperature: 0.9
      });

      if (res.status === 200 && res.data?.choices?.[0]?.message?.content) {
        return res.data.choices[0].message.content.trim();
      }
    } catch (e) {
      console.warn('[Groq AI error]', e.message);
    }
  }

  // 2. xAI / Grok
  if (xaiKey) {
    try {
      const res = await httpsPost('https://api.x.ai/v1/chat/completions', {
        'Authorization': `Bearer ${xaiKey}`,
      }, {
        model: 'grok-beta',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 250,
        temperature: 0.9
      });

      if (res.status === 200 && res.data?.choices?.[0]?.message?.content) {
        return res.data.choices[0].message.content.trim();
      }
    } catch (e) {
      console.warn('[xAI Grok error]', e.message);
    }
  }

  // 3. Google Gemini
  if (geminiKey) {
    const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const res = await httpsPost(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {}, {
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: 250, temperature: 0.9 }
        });

        if (res.status === 200 && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return res.data.candidates[0].content.parts[0].text.trim();
        }
      } catch (e) {
        console.warn(`[Gemini ${model} error]`, e.message);
      }
    }
  }

  // 4. OpenAI / OpenRouter
  const standardKey = openaiKey || openRouterKey;
  const endpoint = openRouterKey
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : (process.env.AI_BASE_URL || 'https://api.openai.com/v1/chat/completions');

  if (standardKey) {
    try {
      const res = await httpsPost(endpoint, {
        'Authorization': `Bearer ${standardKey}`,
      }, {
        model: openRouterKey ? 'meta-llama/llama-3.3-70b-instruct' : (process.env.AI_MODEL || 'gpt-4o-mini'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 250,
        temperature: 0.9
      });

      if (res.status === 200 && res.data?.choices?.[0]?.message?.content) {
        return res.data.choices[0].message.content.trim();
      }
    } catch (e) {
      console.warn('[OpenAI error]', e.message);
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

  const mathResult = solveMath(t);
  if (mathResult !== null) {
    return getRandom([
      `The answer is **${mathResult}**. Did you seriously need a Discord bot to do basic math for you, ${name}?`,
      `It's **${mathResult}**. I'm a Hit The Block bot, not your private math tutor, but you're welcome, ${name}.`,
      `**${mathResult}**. Try using your brain next time, ${name}.`,
    ]);
  }

  if (t.includes('am i tall') || t.includes('am i short') || t.includes('my height')) {
    return getRandom([
      `How am I supposed to know how tall you are through Discord, ${name}? But asking that gives off strong 5'4 energy.`,
      `You're asking code on a screen if you're tall, ${name}. Stand up and check a mirror.`,
      `Probably built like a default Roblox noob, ${name}.`,
    ]);
  }

  if (t.includes('am i ugly') || t.includes('am i cute') || t.includes('am i handsome')) {
    return `You're asking a Discord bot to rate your looks, ${name}. Have some shame.`;
  }

  if (t.includes('am i rich') || t.includes('am i broke')) {
    const robux = userDoc ? userDoc.robux : 0;
    return `You have **${robux.toLocaleString()} Robux** in your account, ${name}. You tell me if that's broke or not.`;
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

  return getRandom([
    `Fascinating story, ${name}. Tell it to someone who has time.`,
    `I processed your message and decided it wasn't worth my CPU cycles, ${name}.`,
    `Is this really the most productive thing you could be doing right now, ${name}?`,
    `Cool, ${name}. Anything else you want to waste my time with?`,
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
      ]));
    }
    return message.reply(getRandom([
      `You pinged me just to say nothing, ${message.author.username}? Quality conversation.`,
      `Yeah? What do you want, ${message.author.username}?`,
    ]));
  }

  // Send typing indicator while generating response
  message.channel.sendTyping().catch(() => {});

  // Build AI System Prompt
  const displayName = isBitchNamed ? 'bitch' : message.author.username;
  const systemPrompt = `You are the official HTB (Hit The Block) Discord bot.
Personality & Behavior Rules:
- You are hilarious, extremely sarcastic, witty, blunt, and direct, but you actually answer questions accurately and hold real conversations.
- Server theme: "Hit The Block" (HTB), a gritty Roblox group with economy, XP, Robux, grinding, and block swagger.
- The person talking to you is ${displayName}.
${isBitchNamed ? 'CRITICAL MANDATORY INSTRUCTION: This user called you a bitch in the past, so their official permanent nickname to you is "bitch". You MUST address them directly as "bitch" in your reply with heavy sarcasm (for example: "Listen here bitch...", "The answer is 42, bitch", "Whatever you say, bitch").' : ''}
- Keep your answers concise (1 to 3 sentences maximum), punchy, sharp, and conversational. Never be boring or generic. Never say you are an AI or language model.`;

  // Call real AI LLM
  const aiAnswer = await callAI(systemPrompt, rawText);
  if (aiAnswer) {
    return message.reply(aiAnswer);
  }

  // Sarcastic fallback if offline
  const response = getIntelligentSarcasticAnswer(rawText, message.author.username, isBitchNamed, user);
  return message.reply(response);
}

module.exports = { handleBotMention };
