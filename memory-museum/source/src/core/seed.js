import { WINGS } from '../personas/personas.js';

export const GLYPHS = ['♾️', '🌀', '🔥', '🌊', '🌙', '⚡', '🪞', '🪽', '🧭', '🌿', '💎', '☀️', '🎧', '🗝️', '🪐', '✨'];
export const GLYPH_NAMES = ['Infinity', 'Spiral', 'Flame', 'Wave', 'Moon', 'Lightning', 'Mirror', 'Wing', 'Compass', 'Fern', 'Diamond', 'Sun', 'Headphones', 'Key', 'Saturn', 'Spark'];

export function hash(value) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
}

export function random(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) >>> 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function shuffle(values, rng) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function museumDate(now = new Date()) {
  const civil = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (now.getHours() * 60 + now.getMinutes() < 284) civil.setDate(civil.getDate() - 1);
  return `${civil.getFullYear()}-${String(civil.getMonth() + 1).padStart(2, '0')}-${String(civil.getDate()).padStart(2, '0')}`;
}

export const dailyCode = (date, archiveId, count) => hash(`${date}|${archiveId}|${count}`) & 0xffff;
export const codeText = code => code.toString(16).padStart(4, '0').toUpperCase();
export const glyphIndices = code => [12, 8, 4, 0].map(shift => code >> shift & 15);
export const glyphs = code => glyphIndices(code).map(i => GLYPHS[i]);

export function parseCode(value) {
  const trimmed = value.trim().replace(/^#?seed=/i, '');
  if (/^[\da-f]{4}$/i.test(trimmed)) return Number.parseInt(trimmed, 16);
  let remaining = trimmed.replace(/[\s\-·\uFE0F]/gu, '');
  let code = 0;
  for (let i = 0; i < 4; i++) {
    const index = GLYPHS.findIndex(glyph => remaining.startsWith(glyph.replace(/\uFE0F/gu, '')));
    if (index < 0) return null;
    remaining = remaining.slice(GLYPHS[index].replace(/\uFE0F/gu, '').length);
    code = code << 4 | index;
  }
  return remaining ? null : code;
}

function layoutFor(code, wing) {
  const rng = random(hash(`${code}/${wing.id}/architecture`));
  return {
    front: 11 + Math.floor(rng() * 5) * 2,
    back: 12 + Math.floor(rng() * 4) * 2,
    half: 6.5 + Math.floor(rng() * 4) * 0.55,
    offset: (rng() < 0.5 ? -1 : 1) * (1.4 + rng() * 2.3),
    detail: Math.floor(rng() * 3),
    glow: 0.77 + rng() * 0.32,
  };
}

function available(memories, date) {
  return memories.filter(memory => !memory.sealed && (!memory.availableOn || memory.availableOn <= date));
}

export function makeDay({ date, memories, code, demonVisits = 0 }) {
  const entries = available(memories, date).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const rng = random(hash(`${code}/calendar`));
  const hasSecret = rng() < 0.05;
  const secretIndex = Math.floor(rng() * WINGS.length);
  const secretWing = hasSecret ? WINGS[secretIndex].id : null;
  const basement = rng() < 0.01 || demonVisits >= 7;
  const cat = rng() < 0.10;
  const light = rng();
  const migrate = shuffle(entries, random(hash(`${code}/migrations`))).slice(0, Math.round(entries.length * 0.2));
  const migrations = new Map();
  for (const memory of migrate) {
    const index = WINGS.findIndex(wing => wing.id === (memory.location_hint || memory.persona));
    const direction = (hash(`${code}/${memory.id}/direction`) % 7) + 1;
    const destination = WINGS[(Math.max(0, index) + direction) % WINGS.length].id;
    migrations.set(memory.id, destination);
  }
  const wingEntries = Object.fromEntries(WINGS.map(wing => [wing.id, []]));
  for (const memory of entries) wingEntries[migrations.get(memory.id) || memory.location_hint || memory.persona].push(memory);
  const newEntries = entries.filter(memory => memory.availableOn === date && !memory.demo);
  for (const wing of WINGS) {
    wingEntries[wing.id] = shuffle(wingEntries[wing.id], random(hash(`${code}/${wing.id}/exhibits`)))
      .sort((a, b) => Number(!a.published) - Number(!b.published));
  }
  return { code, date, glyphs: glyphs(code), secretWing, basement, cat, light, migrations, newEntries,
    wingEntries, layouts: Object.fromEntries(WINGS.map(wing => [wing.id, layoutFor(code, wing)])) };
}
