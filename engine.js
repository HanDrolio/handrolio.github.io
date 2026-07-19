/* COSM.OS — routing engine
   Deterministic. No model, no network. Scores keywords, applies safety
   overrides, honours an explicit call (@name / "orion,"), returns one voice. */

const SAFETY = [
  // ground before anything else
  { test: /\b(can'?t sleep|haven'?t slept|no sleep|three days|hands shaking|racing|everything is connected|chosen|signs everywhere)\b/i,
    persona: 'brix',
    line: 'Stop. Body check first — water, food, sleep, feet on the floor. Everything else waits until those four are handled.' },
  // fatigue softens Demon
  { test: /\b(exhausted|burnt ?out|breaking down|can'?t do this|falling apart|so tired)\b/i,
    persona: 'astro',
    line: 'You\'re running on empty and still showing up. Nothing gets decided from here. Rest is the move, not a delay of the move.' }
];

function normalize(s) {
  return s.toLowerCase().replace(/[^\w\s'@.]/g, ' ').replace(/\s+/g, ' ').trim();
}

/* explicit call: "@astro", "astro:", "astro," at the start */
function explicitCall(text) {
  const t = normalize(text);
  for (const id of ORDER) {
    const n = PERSONAS[id].name.toLowerCase().replace('.', '\\.');
    if (new RegExp(`^@?${n}\\b`).test(t)) return id;
  }
  if (/^@?cosmos\b|^@?cosm\.os\b/.test(t)) return 'cosmos';
  return null;
}

function score(text) {
  const t = normalize(text);
  const scores = {};
  for (const id of ORDER) {
    let s = 0;
    for (const k of PERSONAS[id].keys) if (t.includes(k)) s += 1;
    scores[id] = s;
  }
  return scores;
}

/* strip the persona call and trailing punctuation so {x} reads clean */
function payload(text) {
  return text.replace(/^@?\w+[,:]?\s*/i, '').replace(/[.!?]+$/, '').trim() || text.trim();
}

function pick(arr, seed) {
  return arr[Math.abs(seed) % arr.length];
}

/* main entry. lock = persona id or null */
function route(text, lock) {
  const clean = payload(text);
  const seed = text.length * 31 + text.charCodeAt(0);

  for (const rule of SAFETY) {
    if (rule.test.test(text)) {
      return { persona: rule.persona, text: rule.line, override: true };
    }
  }

  const called = explicitCall(text);
  const id = called || lock || topScorer(text);
  const line = pick(PERSONAS[id].lines, seed).replace(/\{x\}/g, clean);
  return { persona: id, text: line, override: false };
}

function topScorer(text) {
  const s = score(text);
  let best = 'flux', bestScore = 0;
  for (const id of ORDER) {
    if (s[id] > bestScore) { best = id; bestScore = s[id]; }
  }
  return bestScore === 0 ? 'flux' : best;
}
