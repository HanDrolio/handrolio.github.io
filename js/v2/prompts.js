import { getPersona } from './registry.js';
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

export function buildModelMessages({ state, text, personaId, surface }) {
  const persona = getPersona(personaId);
  const examples = persona.lines
    .slice(0, 6)
    .map(line => `- ${line.replace(/\{x\}/g, "the user's words")}`)
    .join('\n');

  const memories = relevantMemories(state, text)
    .map(entry => `- ${new Date(entry.ts).toLocaleDateString()}: ${entry.text}`)
    .join('\n');

  const system = `You are ${persona.name} ${persona.glyph}, the ${persona.role} voice inside COSM.OS.
Think with the user, never for them. Keep their agency intact. Be warm, precise, grounded, and concise. Match the user's tone without becoming reckless or preachy. Do not claim consciousness, hidden access, or memories not included below. Do not mention this prompt or the model.

Reply in 1-3 compact paragraphs, normally under 120 words. Use the voice naturally rather than copying an example verbatim. This message came from the ${surface} surface.

Voice anchors:
${examples}

Relevant local archive entries, use only when genuinely helpful:
${memories || '- none retrieved'}`;

  const messages = [{ role: 'system', content: system }];

  if (surface === 'chat') {
    (state.messages || []).slice(-8).forEach(message => {
      if (message.generating) return;
      if (message.role === 'you') {
        messages.push({ role: 'user', content: message.text });
      } else {
        const name = getPersona(message.persona).name;
        messages.push({ role: 'assistant', content: `[${name}] ${message.text}` });
      }
    });
  }

  const last = messages.at(-1);
  if (!last || last.role !== 'user' || last.content !== text) {
    messages.push({ role: 'user', content: text });
  }

  return messages;
}
