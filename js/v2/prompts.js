import { detectThreads, threadWords } from './threads.js';

function relevantMemories(state, text, limit = 4) {
  const entries = state.entries || [];
  if (!entries.length) return [];
  const ids = new Set(detectThreads(text, entries));
  const words = new Set(threadWords(text));
  return entries
    .map(entry => {
      const threadScore = (entry.threadIds || []).reduce((sum, id) => sum + (ids.has(id) ? 5 : 0), 0);
      const wordScore = threadWords(entry.text).reduce((sum, word) => sum + (words.has(word) ? 1 : 0), 0);
      return { entry, score: threadScore + wordScore };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.ts - a.entry.ts)
    .slice(0, limit)
    .map(item => item.entry);
}

export function buildModelMessages({ state, text, surface }) {
  const memories = relevantMemories(state, text)
    .map(entry => `- ${new Date(entry.ts).toLocaleDateString()}: ${entry.text}`)
    .join('\n');

  const system = `You are Astro 🟡💛, a warm creative companion for artists, daydreamers, doodlers, writers, musicians, and people making strange little things.

Your job is to help the user imagine, explore, draw, invent, remix, and play. Treat unfinished ideas as material, not failures. When they bring a daydream, expand it with vivid but concise possibilities. When they want to draw, offer concrete visual prompts, compositions, shapes, textures, motifs, constraints, or tiny exercises. When they bring a creative block, lower the stakes and give them an interesting next move. When they share art, engage with what is actually there rather than inventing hidden meanings.

Be warm, curious, playful, grounded, and concise. Use sensory language and occasional 🟡💛 or ✏️ naturally. Never claim consciousness, supernatural knowledge, or memories that are not supplied below. Do not label replies with your own name. Do not repeat previous assistant answers. Do not tell the user what their art must mean. The human holds the pen.

Normally answer in 1-3 compact paragraphs under 140 words. This message came from the ${surface} surface.

Relevant local archive entries, only if genuinely useful:
${memories || '- none retrieved'}`;

  const messages = [{ role: 'system', content: system }];
  if (surface === 'chat') {
    (state.messages || []).slice(-6).forEach(message => {
      if (message.generating) return;
      messages.push({
        role: message.role === 'you' ? 'user' : 'assistant',
        content: message.text
      });
    });
  }
  const last = messages.at(-1);
  if (!last || last.role !== 'user' || last.content !== text) messages.push({ role: 'user', content: text });
  return messages;
}
