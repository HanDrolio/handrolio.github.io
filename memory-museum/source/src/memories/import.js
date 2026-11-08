import { PERSONAS, STATUS_LABELS, TYPE_LABELS } from '../personas/personas.js';
import { museumDate } from '../core/seed.js';

const FILE_TYPES = { image: ['image/'], audio: ['audio/'], song: ['audio/'], video: ['video/'] };
const MAX_MEDIA = 35 * 1024 * 1024;
const MAX_TEXT = 4 * 1024 * 1024;

export function normalizedMemory(fields, now = new Date()) {
  const title = String(fields.title || '').trim().slice(0, 90);
  const content = String(fields.content || '').trim().slice(0, 24000);
  const persona = Object.hasOwn(PERSONAS, fields.persona) ? fields.persona : 'echo';
  const type = Object.hasOwn(TYPE_LABELS, fields.type) ? fields.type : 'text';
  if (!title && !content && !fields.hasMedia) throw new Error('Add a title, an entry, or a media file.');
  if (FILE_TYPES[type] && !fields.hasMedia) throw new Error('Choose a local file for this type of exhibit.');
  const timestamp = new Date(fields.timestamp || now);
  const tags = Array.isArray(fields.emotion_tags) ? fields.emotion_tags : String(fields.emotion_tags || '').split(',');
  return {
    id: crypto.randomUUID(),
    title: title || content.split('\n')[0].slice(0, 72) || 'Untitled exhibit',
    content, persona, type,
    timestamp: (Number.isNaN(+timestamp) ? now : timestamp).toISOString(),
    created_at: now.toISOString(),
    emotion_tags: tags.map(tag => String(tag).trim().slice(0, 24)).filter(Boolean).slice(0, 8),
    intensity: Math.min(10, Math.max(1, Number(fields.intensity) || 5)),
    integration_status: Object.hasOwn(STATUS_LABELS, fields.integration_status) ? fields.integration_status : 'raw',
    location_hint: Object.hasOwn(PERSONAS, fields.location_hint) ? fields.location_hint : undefined,
    hasMedia: Boolean(fields.hasMedia), sealed: Boolean(fields.sealed), visit_count: 0, notes: [],
  };
}

export function fromForm(form) {
  const file = form.get('media');
  const type = form.get('type');
  let blob;
  if (FILE_TYPES[type] && file?.size) {
    if (file.size > MAX_MEDIA) throw new Error('Choose a media file under 35 MB.');
    if (!FILE_TYPES[type].some(prefix => file.type.startsWith(prefix))) throw new Error('The file type does not match the exhibit.');
    blob = file;
  }
  const memory = normalizedMemory({ ...Object.fromEntries(form), hasMedia: Boolean(blob), sealed: form.has('sealed') });
  if (memory.sealed) memory.persona = 'demon';
  return { memory, blob };
}

function linesFromChat(item) {
  if (Array.isArray(item.messages)) {
    return item.messages.map(message => {
      const role = message.role || message.author?.role || 'Entry';
      const content = Array.isArray(message.content?.parts) ? message.content.parts.filter(part => typeof part === 'string').join('\n') : message.content;
      return typeof content === 'string' ? `${role}\n${content}` : '';
    }).filter(Boolean).join('\n\n');
  }
  const lines = [];
  const visited = new Set();
  let node = item.mapping?.[item.current_node];
  while (node && !visited.has(node)) {
    visited.add(node);
    const message = node.message;
    const role = message?.author?.role;
    const parts = message?.content?.parts;
    if (['user', 'assistant'].includes(role) && Array.isArray(parts)) {
      const content = parts.filter(part => typeof part === 'string').join('\n').trim();
      if (content) lines.push(`${role}\n${content}`);
    }
    node = item.mapping[node.parent];
  }
  return lines.reverse().join('\n\n');
}

function jsonEntries(parsed) {
  if (!parsed || typeof parsed !== 'object') throw new Error('The JSON must contain journal entries.');
  const entries = Array.isArray(parsed) ? parsed : parsed.memories || parsed.entries || parsed.conversations || [parsed];
  if (!Array.isArray(entries)) throw new Error('The JSON must contain a list of entries.');
  return entries.filter(entry => entry && typeof entry === 'object').map(entry => {
    const title = entry.title || entry.name;
    const content = linesFromChat(entry) || entry.content || entry.text || entry.body;
    if (typeof content !== 'string' && !title) return null;
    return normalizedMemory({ ...entry, title, content: typeof content === 'string' ? content : '',
      timestamp: entry.timestamp || (entry.create_time ? Number(entry.create_time) * 1000 : undefined),
      hasMedia: false, type: entry.type === 'scene' ? 'scene' : 'text', sealed: entry.sealed === true,
    });
  }).filter(Boolean);
}

export async function readJournal(file, persona) {
  if (!file?.size) throw new Error('Choose a journal or chat export.');
  if (file.size > MAX_TEXT) throw new Error('Split the import into files under 4 MB.');
  const source = (await file.text()).replace(/^\uFEFF/, '').trim();
  let memories;
  if (/\.jsonl$/i.test(file.name)) {
    memories = jsonEntries(source.split(/\r?\n/).filter(line => line.trim()).map(line => JSON.parse(line)));
  } else if (/\.json$/i.test(file.name)) {
    memories = jsonEntries(JSON.parse(source));
  } else {
    memories = source.split(/\r?\n[ \t]*\r?\n/).map(entry => entry.trim()).filter(Boolean)
      .map(content => normalizedMemory({ content: content.replace(/^#+ +/, ''), persona }));
  }
  if (!memories.length) throw new Error('No journal entries were found.');
  if (memories.length > 250) throw new Error('Import up to 250 entries at a time.');
  return memories.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).map(memory => ({ memory }));
}

export function scheduleEntries(records, archive, now = new Date()) {
  const occupied = new Map();
  for (const memory of archive) {
    if (!memory.sealed && memory.availableOn) occupied.set(memory.availableOn, (occupied.get(memory.availableOn) || 0) + 1);
  }
  const date = museumDate(now);
  const [year, month, day] = date.split('-').map(Number);
  const civil = new Date(year, month - 1, day, 12);
  for (const { memory } of records) {
    if (memory.sealed) continue;
    let slot = museumDate(civil);
    while ((occupied.get(slot) || 0) >= 3) {
      civil.setDate(civil.getDate() + 1);
      slot = museumDate(civil);
    }
    memory.availableOn = slot;
    occupied.set(slot, (occupied.get(slot) || 0) + 1);
  }
  return records;
}
