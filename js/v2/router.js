import { ORDER, PERSONAS } from './registry.js';

const SAFETY_RULES = [
  {
    test: /\b(can'?t sleep|haven'?t slept|no sleep|three days|hands shaking|racing|everything is connected|chosen|signs everywhere)\b/i,
    persona: 'brix',
    text: 'Stop. Body check first: water, food, sleep, feet on the floor. Everything else waits until those four are handled.'
  },
  {
    test: /\b(exhausted|burnt ?out|breaking down|can'?t do this|falling apart|so tired)\b/i,
    persona: 'astro',
    text: 'You are running on empty and still showing up. Nothing gets decided from here. Rest is the move, not a delay of the move.'
  }
];

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s'@.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function explicitCall(text) {
  const normalized = normalize(text);
  for (const id of ORDER) {
    const name = PERSONAS[id].name.toLowerCase().replace('.', '\\.');
    if (new RegExp(`^@?${name}\\b`).test(normalized)) return id;
  }
  if (/^@?cosmos\b|^@?cosm\.os\b/.test(normalized)) return 'cosmos';
  return null;
}

function score(text) {
  const normalized = normalize(text);
  return Object.fromEntries(ORDER.map(id => {
    const points = PERSONAS[id].keys.reduce((total, key) => total + (normalized.includes(key) ? 1 : 0), 0);
    return [id, points];
  }));
}

function topScorer(text) {
  const scores = score(text);
  let best = 'flux';
  let bestScore = 0;

  for (const id of ORDER) {
    if (scores[id] > bestScore) {
      best = id;
      bestScore = scores[id];
    }
  }

  return bestScore ? best : 'flux';
}

function payload(text) {
  return String(text || '')
    .replace(/^@?\w+[,:]?\s*/i, '')
    .replace(/[.!?]+$/, '')
    .trim() || String(text || '').trim();
}

function deterministicLine(personaId, text) {
  const lines = PERSONAS[personaId]?.lines || PERSONAS.flux.lines;
  const seed = Math.max(1, text.length * 31 + (text.charCodeAt(0) || 0));
  return lines[Math.abs(seed) % lines.length].replace(/\{x\}/g, payload(text));
}

export function route(text, lock = null) {
  for (const rule of SAFETY_RULES) {
    if (rule.test.test(text)) {
      return { persona: rule.persona, text: rule.text, override: true };
    }
  }

  const persona = explicitCall(text) || lock || topScorer(text);
  return {
    persona,
    text: deterministicLine(persona, text),
    override: false
  };
}
