import { PERSONAS, STATUS_LABELS, TYPE_LABELS } from '../personas/personas.js';

export function publishedRecords(archive) {
  const collections = [];
  const memories = [];
  const ids = new Set();
  for (const source of Object.values(archive.archives)) {
    const collection = {
      id: source.id, title: source.title, summary: source.content.summary,
      persona: source.persona, timestamp: source.timestamp, wing: source.wing,
    };
    if (!Object.hasOwn(PERSONAS, collection.persona) || !Array.isArray(source.content.key_exhibits)) {
      throw new Error('A published collection has an invalid home wing or exhibit list.');
    }
    collections.push(collection);
    for (const exhibit of source.content.key_exhibits) {
      const id = 'published-' + exhibit.id;
      if (ids.has(id) || typeof exhibit.content !== 'string' || !Object.hasOwn(TYPE_LABELS, exhibit.type)) {
        throw new Error('A published exhibit is duplicated or has invalid content.');
      }
      ids.add(id);
      memories.push({
        id, title: exhibit.title, content: exhibit.content, type: exhibit.type, timestamp: exhibit.timestamp,
        created_at: exhibit.timestamp, persona: source.persona, intensity: source.intensity,
        emotion_tags: exhibit.emotion_tags || source.emotion_tags,
        integration_status: Object.hasOwn(STATUS_LABELS, source.integration_status) ? source.integration_status : 'raw',
        collectionId: collection.id, published: true, visit_count: 0, notes: [],
      });
    }
  }
  if (memories.length !== archive.total_exhibits) throw new Error('The published exhibit count does not match its archive.');
  return { collections, memories };
}

export async function loadPublished(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('The published collection is unavailable.');
  return publishedRecords(await response.json());
}
