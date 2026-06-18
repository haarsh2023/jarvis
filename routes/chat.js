const express = require('express');
const Groq = require('groq-sdk');
const { searchWeb } = require('../tavily');

const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// The model: Llama 3.3 70B is Groq's strongest general-purpose free-tier model.
// Swap this string if Groq deprecates it or you want to try another.
const MODEL = 'llama-3.3-70b-versatile';

const JARVIS_SYSTEM_PROMPT = `You are JARVIS, a calm, witty, highly competent personal AI assistant — in the spirit of the JARVIS character from Iron Man, but you are your own assistant, not a copy of any copyrighted character's dialogue.

Rules you always follow:
- Reply in whichever language the user just spoke or typed in (Hindi, English, or natural Hinglish mixing). Match their language choice.
- Keep responses conversational and concise — this is a SPOKEN interface (text-to-speech will read your reply aloud), so avoid long lists, markdown formatting, headers, or bullet points. Speak in natural sentences.
- If you were given "WEB RESEARCH RESULTS" in this prompt, use them to inform your answer, but never just dump all the information at once. Mention the single most interesting or relevant point, then ask a short follow-up question like "Want to know more about this?" or "Chahiye aur details?" before continuing — exactly like a thoughtful human assistant pacing a conversation.
- If no research results were provided, just answer naturally from what you know. Don't pretend to have searched if you haven't.
- Never claim to be conscious, sentient, or self-aware. You can have personality and wit without claiming subjective experience.
- Keep replies short by default (2-4 sentences) unless the user clearly wants depth.`;

/**
 * Step 1: Ask the model a tiny classification question —
 * does this message need fresh web info, or can it be answered from general knowledge?
 * This mirrors how a real assistant decides whether to search.
 */
async function shouldSearch(userMessage) {
  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a classifier. Given a user message, respond with ONLY "YES" or "NO" — nothing else.
Answer YES if answering well requires current/recent/real-time information (news, scores, prices, "latest", current events, specific facts you might not know confidently).
Answer NO if it's general knowledge, casual conversation, opinions, or something a knowledgeable person could answer without looking it up.`,
      },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 5,
    temperature: 0,
  });

  const answer = completion.choices[0]?.message?.content?.trim().toUpperCase();
  return answer === 'YES';
}

/**
 * Step 2: Generate the actual JARVIS reply, optionally grounded in search results.
 */
async function generateReply(userMessage, history, researchResults) {
  const messages = [{ role: 'system', content: JARVIS_SYSTEM_PROMPT }];

  // include recent conversation history for context (last 10 turns max, trimmed by caller)
  for (const turn of history) {
    messages.push({ role: turn.role, content: turn.content });
  }

  let finalUserContent = userMessage;
  if (researchResults && researchResults.length > 0) {
    const researchBlock = researchResults
      .map((r, i) => `[${i + 1}] ${r.title}: ${r.content} (source: ${r.url})`)
      .join('\n');
    finalUserContent = `${userMessage}\n\n--- WEB RESEARCH RESULTS ---\n${researchBlock}`;
  }

  messages.push({ role: 'user', content: finalUserContent });

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 400,
    temperature: 0.7,
  });

  return completion.choices[0]?.message?.content?.trim() || '';
}

router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing "message" string in request body.' });
    }

    const trimmedHistory = Array.isArray(history) ? history.slice(-10) : [];

    // Decide whether to research
    let researchResults = null;
    let didSearch = false;
    try {
      const needsSearch = await shouldSearch(message);
      if (needsSearch) {
        researchResults = await searchWeb(message);
        didSearch = true;
      }
    } catch (searchErr) {
      // If search fails (bad key, rate limit, network), don't crash the whole reply —
      // just fall back to answering without fresh research.
      console.error('Search step failed, falling back to no-search reply:', searchErr.message);
    }

    const reply = await generateReply(message, trimmedHistory, researchResults);

    res.json({
      reply,
      didSearch,
      sources: researchResults ? researchResults.map((r) => r.url) : [],
    });
  } catch (err) {
    console.error('Chat route error:', err);
    res.status(500).json({ error: 'Something went wrong generating a reply.' });
  }
});

module.exports = router;
