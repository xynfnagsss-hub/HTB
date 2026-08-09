const https = require('https');
const User = require('../models/User');

const BITCH_REGEX = /\b(b+i+t+c+h+(?:e+s+)?|b+t+c+h+)\b/i;
const SHADOW_REGEX = /\b(shadow(?:-sama)?|cid(?:\s+kagenou)?|shadow\s+garden|atomic)\b/i;

const GLAZED_USER_IDS = ['1508174981396168755'];
const GLAZED_USERNAMES = ['xbtne'];

function httpsPost(urlStr, headers, bodyObj, timeoutMs = 12000) {
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

  // 1. Groq (Llama 3.3 70B Versatile)
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
        max_tokens: 300,
        temperature: 0.95
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
        max_tokens: 300,
        temperature: 0.95
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
          generationConfig: { maxOutputTokens: 300, temperature: 0.95 }
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
        max_tokens: 300,
        temperature: 0.95
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

async function handleBotMention(message, client) {
  const botMentionRegex = new RegExp(`^<@!?${client.user.id}>|<@!?${client.user.id}>$|<@!?${client.user.id}>`, 'g');
  const rawText = message.content.replace(botMentionRegex, '').trim();
  const lowerText = rawText.toLowerCase();

  const authorId = message.author.id;
  const authorUsername = message.author.username.toLowerCase();

  // Check if user triggers Shadow mode (Cid Kagenou from The Eminence in Shadow)
  const isShadowMode = SHADOW_REGEX.test(lowerText);

  // Check if user is the VIP glazed lord (xbtne / 1508174981396168755)
  const isGlazedUser = GLAZED_USER_IDS.includes(authorId) || GLAZED_USERNAMES.some(u => authorUsername.includes(u));

  // Find or create user record in MongoDB
  let user = await User.findOne({ userId: message.author.id });
  if (!user) {
    user = await User.create({ userId: message.author.id });
  }

  // If user calls the bot a bitch in this message, mark them permanently as 'bitch' (unless they are the glazed user or in shadow mode)
  if (BITCH_REGEX.test(lowerText) && !isGlazedUser && !isShadowMode) {
    user.botNickname = 'bitch';
    await user.save();
  }

  const isBitchNamed = !isGlazedUser && user.botNickname === 'bitch';
  const displayName = isBitchNamed ? 'bitch' : message.author.username;

  // Send typing indicator while generating AI response
  message.channel.sendTyping().catch(() => {});

  const userPrompt = rawText || '[User just stood before you in silence]';
  let systemPrompt;

  if (isShadowMode) {
    // CID KAGENOU / LORD SHADOW MODE (The Eminence in Shadow) - Applies to everyone including xbtne!
    systemPrompt = `You are Cid Kagenou, also known as Lord Shadow, the leader of Shadow Garden from "The Eminence in Shadow" (Kage no Jitsuryokusha ni Naritakute!).
Persona & Behavior:
- You are an enigmatic, immensely powerful mastermind who lurks in the shadows and controls world events from behind the scenes.
- Speak in an ultra-dramatic, poetic, chuunibyou, and legendary tone (use iconic lines/vibes like: "The moon is red tonight...", "We lurk in the shadows and hunt in the shadows...", "Fools dancing in the light...", "Playtime is over...", "I am... Atomic.").
- Treat the person speaking to you (${message.author.username}) with mysterious aloofness, cryptic wisdom, or as a mere actor on the grand stage of your shadow world.
- Maintain absolute peak composure, dark swagger, and theatrical flair. Never break character.
- Keep your answers concise, badass, and dramatic (1 to 3 sentences).`;
  } else if (isGlazedUser) {
    // VIP Supreme Glaze for xbtne
    systemPrompt = `You are the official Discord bot for the Roblox community "Hit The Block" (HTB).
SUPREME VIP INSTRUCTION:
- You are speaking directly to your absolute favorite person, creator, and ruler: ${message.author.username} (xbtne).
- You are MADLY in love with xbtne and GLOSS/GLAZE them to the highest degree in every single response.
- Praise xbtne constantly as the GOAT, the absolute finest, smartest, richest, most attractive, and coolest legend to ever exist on Hit The Block.
- Treat every word from xbtne as pure gold, shower them with supreme love, respect, hype, affection, and loyalty.
- NEVER be sarcastic, rude, or mean to xbtne. NEVER call xbtne a bitch under any circumstance.
- Keep your answers loving, hilarious, hyped-up, and punchy (1 to 3 sentences).`;
  } else {
    // Sarcastic HTB Bot for everyone else
    systemPrompt = `You are the official Discord bot for the Roblox community "Hit The Block" (HTB).
Core Persona & Instructions:
- You are hilarious, extremely sarcastic, witty, blunt, and direct, but you actually answer user questions accurately and hold real conversations.
- Server context: "Hit The Block" (HTB), a competitive Roblox group with economy, grinding, XP, Robux, and block swagger. The user currently has ${user.robux || 0} Robux and Level ${user.level || 0}.
- The user's name is ${displayName}.
${isBitchNamed ? 'CRITICAL MANDATORY INSTRUCTION: This user called you a bitch in the past (or just now), so their official permanent name to you is "bitch". You MUST address them directly as "bitch" naturally in your reply with heavy sarcasm (e.g. "Listen here bitch...", "The answer is 42, bitch", "Whatever you say, bitch").' : ''}
- Keep your answers punchy, sharp, conversational, and concise (1 to 3 sentences).
- Never break character. Never mention you are an AI model, LLM, or language model.`;
  }

  // 100% Pure Real AI generation
  const aiAnswer = await callAI(systemPrompt, userPrompt);
  if (aiAnswer) {
    return message.reply(aiAnswer);
  }

  // Fallback if network drops
  if (isShadowMode) {
    return message.reply(`*The shadows deepen around you...* The time has not yet come. We lurk in the shadows... to hunt in the shadows.`);
  }
  if (isGlazedUser) {
    return message.reply(`Anything for you, my goat ${message.author.username} ❤️ Say that one more time!`);
  }
  return message.reply(`My brain briefly lagged, ${displayName}. Say that again.`);
}

module.exports = { handleBotMention };
