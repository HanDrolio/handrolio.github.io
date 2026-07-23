/* COSM.OS — Living Threads
   Deterministic continuity for journal entries. No model, no network.
   A thread appears only after a subject repeats, and only on its newest entry. */

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

const THREAD_STOP_WORDS = new Set([
  'about','after','again','also','always','another','because','before','being','could','didnt','doesnt','doing','dont','every','feeling','first','going','gonna','gotta','having','here','just','kinda','like','maybe','really','right','should','something','still','thing','things','think','today','tomorrow','tonight','very','want','wanted','with','would','yeah','your','youre'
]);

const THREAD_PHASES = [
  { name: 'building', words: ['build','code','coding','create','project','ship','prototype','learn','working','made'] },
  { name: 'play', words: ['play','playing','game','pokemon','pokémon','fun','chilling','music','watching'] },
  { name: 'nostalgia', words: ['remember','used to','last time','back then','again','miss','old'] },
  { name: 'connection', words: ['family','friend','mom','dad','grandma','kendra','manny','yeya','together','love'] },
  { name: 'recovery', words: ['better','healing','recover','calm','stable','moving on','stronger','progress'] },
  { name: 'pressure', words: ['anxiety','panic','stressed','overwhelmed','scared','worried','hard','stuck'] },
  { name: 'grief', words: ['grief','loss','died','death','goodbye','cry','hurt','tiger'] }
];

function threadNormalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9#.'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function threadWords(text) {
  return threadNormalize(text)
    .replace(/[#.']/g, '')
    .split(/\s+/)
    .filter(word => word.length >= 5 && !THREAD_STOP_WORDS.has(word));
}

function threadTitle(id) {
  const known = THREAD_DEFS.find(def => def.id === id);
  if (known) return known.title;
  if (id.startsWith('tag-')) return `#${id.slice(4).replace(/-/g, ' ')}`;
  if (id.startsWith('word-')) {
    const word = id.slice(5).replace(/-/g, ' ');
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
  return id;
}

function priorMentions(word, entries) {
  return entries.some(entry => threadWords(entry.text).includes(word));
}

function detectThreads(text, previousEntries = []) {
  const clean = threadNormalize(text);
  const found = [];

  for (const def of THREAD_DEFS) {
    if (def.aliases.some(alias => clean.includes(threadNormalize(alias)))) found.push(def.id);
  }

  const tags = clean.match(/#[a-z0-9-]{2,30}/g) || [];
  for (const tag of tags) found.push(`tag-${tag.slice(1)}`);

  if (found.length < 2) {
    const recurring = threadWords(text)
      .filter((word, index, words) => words.indexOf(word) === index)
      .filter(word => priorMentions(word, previousEntries));
    for (const word of recurring) found.push(`word-${word}`);
  }

  return [...new Set(found)].slice(0, 3);
}

function makeEntryId(ts = Date.now()) {
  return `e-${ts.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function migrateEntries(entries) {
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

function buildThreadIndex(entries) {
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

function detectThreadPhase(text) {
  const clean = threadNormalize(text);
  let best = null;
  let bestScore = 0;

  THREAD_PHASES.forEach(phase => {
    const score = phase.words.reduce((total, word) => total + (clean.includes(word) ? 1 : 0), 0);
    if (score > bestScore) {
      best = phase.name;
      bestScore = score;
    }
  });

  return best;
}

function describeThread(entries) {
  const first = entries[0];
  const latest = entries[entries.length - 1];
  const firstPhase = detectThreadPhase(first.text);
  const latestPhase = detectThreadPhase(latest.text);

  if (firstPhase && latestPhase && firstPhase !== latestPhase) {
    return `It began around ${firstPhase}. Lately it reads more like ${latestPhase}.`;
  }
  if (latestPhase) {
    return `This keeps returning through ${latestPhase}. ${entries.length} moments now share the thread.`;
  }
  if (entries.length === 2) {
    return 'The subject returned. The details changed, but the thread held.';
  }
  return `${entries.length} moments now form one continuing story.`;
}

function pairThreadForEntry(entry, entries, index) {
  const ids = (entry.threadIds || []).filter(id => (index[id] || []).length >= 2);
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const pairEntries = entries
        .filter(item => (item.threadIds || []).includes(ids[i]) && (item.threadIds || []).includes(ids[j]))
        .sort((a, b) => a.ts - b.ts);
      if (pairEntries.length >= 2 && pairEntries[pairEntries.length - 1].id === entry.id) {
        return {
          id: `${ids[i]}+${ids[j]}`,
          title: `${threadTitle(ids[i])} × ${threadTitle(ids[j])}`,
          entries: pairEntries,
          summary: describeThread(pairEntries)
        };
      }
    }
  }
  return null;
}

function livingThreadForEntry(entry, entries) {
  const index = buildThreadIndex(entries);
  const pair = pairThreadForEntry(entry, entries, index);
  if (pair) return pair;

  const candidates = (entry.threadIds || [])
    .map(id => ({ id, entries: index[id] || [] }))
    .filter(item => item.entries.length >= 2)
    .sort((a, b) => b.entries.length - a.entries.length);

  const primary = candidates[0];
  if (!primary) return null;
  if (primary.entries[primary.entries.length - 1].id !== entry.id) return null;

  return {
    id: primary.id,
    title: threadTitle(primary.id),
    entries: primary.entries,
    summary: describeThread(primary.entries)
  };
}
