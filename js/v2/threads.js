const THREAD_DEFS = [
  { id: 'pokemon', title: 'Pokémon', aliases: ['pokemon', 'pokémon', 'fire red', 'firered', 'platinum', 'sinnoh', 'kanto', 'backbone', 'delta emulator'] },
  { id: 'kendra', title: 'Kendra', aliases: ['kendra'] },
  { id: 'cosmos', title: 'COSM.OS', aliases: ['cosm.os', 'cosmos', 'han.os', 'han os', 'persona', 'orion', 'ripple', 'astro', 'brix', 'demon', 'echo', 'hermes', 'flux'] },
  { id: 'dreams', title: 'Dreams', aliases: ['dream', 'dreamed', 'dreamt', 'nightmare', 'hotel', 'flying', 'teeth falling'] },
  { id: 'family', title: 'Family', aliases: ['mom', 'mother', 'dad', 'father', 'grandma', 'abuela', 'yeya', 'manny', 'steven', 'family'] },
  { id: 'work', title: 'Work', aliases: ['job', 'work', 'grocery outlet', 'remote job', 'disability', 'career'] },
  { id: 'body', title: 'Body', aliases: ['gym', 'workout', 'sleep', 'food', 'anxiety', 'panic', 'medicine', 'meds', 'health'] },
  { id: 'music', title: 'Music', aliases: ['music', 'song', 'suno', 'mix', 'playlist', 'edm', 'bass drop', 'lyrics'] },
  { id: 'grief', title: 'Grief', aliases: ['tiger', 'grief', 'miss', 'loss', 'died', 'death', 'goodbye'] },
  { id: 'building', title: 'Building', aliases: ['code', 'coding', 'javascript', 'app', 'build', 'github', 'project', 'prototype'] }
];

const STOP_WORDS = new Set([
  'about','after','again','also','always','another','because','before','being','could','didnt','doesnt','doing','dont','every','feeling','first','going','gonna','gotta','having','here','just','kinda','like','maybe','really','right','should','something','still','thing','things','think','today','tomorrow','tonight','very','want','wanted','with','would','yeah','your','youre'
]);

const PHASES = [
  { name: 'building', words: ['build','code','coding','create','project','ship','prototype','learn','working','made'] },
  { name: 'play', words: ['play','playing','game','pokemon','pokémon','fun','chilling','music','watching'] },
  { name: 'nostalgia', words: ['remember','used to','last time','back then','again','miss','old'] },
  { name: 'connection', words: ['family','friend','mom','dad','grandma','kendra','manny','yeya','together','love'] },
  { name: 'recovery', words: ['better','healing','recover','calm','stable','moving on','stronger','progress'] },
  { name: 'pressure', words: ['anxiety','panic','stressed','overwhelmed','scared','worried','hard','stuck'] },
  { name: 'grief', words: ['grief','loss','died','death','goodbye','cry','hurt','tiger'] }
];

export function normalizeThreadText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9#.'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function threadWords(text) {
  return normalizeThreadText(text)
    .replace(/[#.']/g, '')
    .split(/\s+/)
    .filter(word => word.length >= 5 && !STOP_WORDS.has(word));
}

function titleFor(id) {
  const known = THREAD_DEFS.find(def => def.id === id);
  if (known) return known.title;
  if (id.startsWith('tag-')) return `#${id.slice(4).replace(/-/g, ' ')}`;
  if (id.startsWith('word-')) {
    const word = id.slice(5).replace(/-/g, ' ');
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return id;
}

function wasMentioned(word, entries) {
  return entries.some(entry => threadWords(entry.text).includes(word));
}

export function detectThreads(text, previousEntries = []) {
  const clean = normalizeThreadText(text);
  const found = [];

  for (const def of THREAD_DEFS) {
    if (def.aliases.some(alias => clean.includes(normalizeThreadText(alias)))) found.push(def.id);
  }

  const tags = clean.match(/#[a-z0-9-]{2,30}/g) || [];
  for (const tag of tags) found.push(`tag-${tag.slice(1)}`);

  if (found.length < 2) {
    const recurring = threadWords(text)
      .filter((word, index, words) => words.indexOf(word) === index)
      .filter(word => wasMentioned(word, previousEntries));
    for (const word of recurring) found.push(`word-${word}`);
  }

  return [...new Set(found)].slice(0, 3);
}

export function makeEntryId(ts = Date.now()) {
  return `e-${ts.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function migrateEntries(entries) {
  let changed = false;
  const chronological = [...entries].sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
  const seen = [];

  chronological.forEach((entry, index) => {
    if (!entry.id) {
      entry.id = `e-${Number(entry.ts || index).toString(36)}-${index.toString(36)}`;
      changed = true;
    }
    if (!Array.isArray(entry.threadIds)) {
      entry.threadIds = detectThreads(entry.text, seen);
      changed = true;
    }
    seen.push(entry);
  });

  return changed;
}

function buildIndex(entries) {
  const index = {};
  entries.forEach(entry => {
    (entry.threadIds || []).forEach(id => {
      if (!index[id]) index[id] = [];
      index[id].push(entry);
    });
  });
  Object.values(index).forEach(list => list.sort((a, b) => a.ts - b.ts));
  return index;
}

function detectPhase(text) {
  const clean = normalizeThreadText(text);
  let best = null;
  let score = 0;

  for (const phase of PHASES) {
    const current = phase.words.reduce((total, word) => total + (clean.includes(word) ? 1 : 0), 0);
    if (current > score) {
      best = phase.name;
      score = current;
    }
  }

  return best;
}

function describe(entries) {
  const first = entries[0];
  const latest = entries[entries.length - 1];
  const firstPhase = detectPhase(first.text);
  const latestPhase = detectPhase(latest.text);

  if (firstPhase && latestPhase && firstPhase !== latestPhase) {
    return `It began around ${firstPhase}. Lately it reads more like ${latestPhase}.`;
  }
  if (latestPhase) return `This keeps returning through ${latestPhase}. ${entries.length} moments now share the thread.`;
  if (entries.length === 2) return 'The subject returned. The details changed, but the thread held.';
  return `${entries.length} moments now form one continuing story.`;
}

export function livingThreadForEntry(entry, entries) {
  const index = buildIndex(entries);
  const candidates = (entry.threadIds || [])
    .map(id => ({ id, entries: index[id] || [] }))
    .filter(item => item.entries.length >= 2)
    .sort((a, b) => b.entries.length - a.entries.length);

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i].id;
      const b = candidates[j].id;
      const pairEntries = entries
        .filter(item => (item.threadIds || []).includes(a) && (item.threadIds || []).includes(b))
        .sort((x, y) => x.ts - y.ts);
      if (pairEntries.length >= 2 && pairEntries.at(-1)?.id === entry.id) {
        return {
          id: `${a}+${b}`,
          title: `${titleFor(a)} × ${titleFor(b)}`,
          entries: pairEntries,
          summary: describe(pairEntries)
        };
      }
    }
  }

  const primary = candidates[0];
  if (!primary || primary.entries.at(-1)?.id !== entry.id) return null;

  return {
    id: primary.id,
    title: titleFor(primary.id),
    entries: primary.entries,
    summary: describe(primary.entries)
  };
}
