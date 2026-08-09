const https = require('https');
const User = require('../models/User');

const BITCH_REGEX = /\b(b+i+t+c+h+(?:e+s+)?|b+t+c+h+)\b/i;

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
        max_tokens: 300,
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
          generationConfig: { maxOutputTokens: 300, temperature: 0.9 }
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

async function handleBotMention(message, client) {
  const botMentionRegex = new RegExp(`^<@!?${client.user.id}>|<@!?${client.user.id}>$|<@!?${client.user.id}>`, 'g');
  const rawText = message.content.replace(botMentionRegex, '').trim();
  const lowerText = rawText.toLowerCase();

  // Find or create user record in MongoDB
  let user = await User.findOne({ userId: message.author.id });
  if (!user) {
    user = await User.create({ userId: message.author.id });
  }

  // If user calls the bot a bitch in this message, mark them permanently as 'bitch'
  if (BITCH_REGEX.test(lowerText)) {
    user.botNickname = 'bitch';
    await user.save();
  }

  const isBitchNamed = user.botNickname === 'bitch';
  const displayName = isBitchNamed ? 'bitch' : message.author.username;

  // Send typing indicator while generating AI response
  message.channel.sendTyping().catch(() => {});

  // Build full AI System Prompt
  const userPrompt = rawText || '[User just pinged you without saying anything]';
  const systemPrompt = `You are the official Discord bot for the Roblox community "Hit The Block" (HTB).
Core Persona & Instructions:
- You are hilarious, extremely sarcastic, witty, blunt, and direct, but you actually answer user questions accurately and hold real conversations.
- Server context: "Hit The Block" (HTB), a competitive Roblox group with economy, grinding, XP, Robux, and block swagger. The user currently has ${user.robux || 0} Robux and Level ${user.level || 0}.
- The user's name is ${displayName}.
${isBitchNamed ? 'CRITICAL MANDATORY INSTRUCTION: This user called you a bitch in the past (or just now), so their official permanent name to you is "bitch". You MUST address them directly as "bitch" naturally in your reply with heavy sarcasm (e.g. "Listen here bitch...", "The answer is 42, bitch", "Whatever you say, bitch").' : ''}
- Keep your answers punchy, sharp, conversational, and concise (1 to 3 sentences).
- Never break character. Never mention you are an AI model, LLM, or language model.`;

  // 100% Pure Real AI generation
  const aiAnswer = await callAI(systemPrompt, userPrompt);
  if (aiAnswer) {
    return message.reply(aiAnswer);
  }

  // If all AI APIs failed unexpectedly
  return message.reply(`My brain briefly lagged, ${displayName}. Say that again.`);
}

module.exports = { handleBotMention };
