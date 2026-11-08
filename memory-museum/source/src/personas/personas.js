export const WINGS = [
  { id: 'orion', name: 'Orion', glyph: '◇', emoji: '🔵🧭', wing: 'Logic', color: '#85bbff', voice: 'Analyze', line: 'A place for things that follow.', tones: [55, 82.41, 110] },
  { id: 'astro', name: 'Astro', glyph: '♥', emoji: '🟡💛', wing: 'Heart', color: '#f5bd73', voice: 'Feel', line: 'Keep what kept you warm.', tones: [49, 73.42, 98] },
  { id: 'ripple', name: 'Ripple', glyph: '≈', emoji: '🟢🌊', wing: 'Presence', color: '#71dec1', voice: 'Breathe', line: 'Stay long enough to notice.', tones: [48.99, 65.41, 97.99] },
  { id: 'brix', name: 'Brix', glyph: '▣', emoji: '🟤🧱', wing: 'Strength', color: '#e59871', voice: 'Lift', line: 'Some weight is worth carrying.', tones: [41.2, 61.74, 82.41] },
  { id: 'demon', name: 'Demon', glyph: '◈', emoji: '🔴🪞', wing: 'Shadow', color: '#fc727a', voice: 'Reframe', line: 'Look when you are ready.', tones: [36.71, 54.99, 65.41] },
  { id: 'hermes', name: 'Hermes', glyph: '✧', emoji: '⚪🪽', wing: 'Story', color: '#eee0be', voice: 'Narrate', line: 'Everything leaves a first line.', tones: [55, 73.42, 110] },
  { id: 'echo', name: 'Echo', glyph: '◎', emoji: '🟠📡', wing: 'Memory', color: '#ffaa71', voice: 'Replay', line: 'Some things return as sound.', tones: [43.65, 65.41, 87.31] },
  { id: 'flux', name: 'Flux', glyph: '⟳', emoji: '🟣🌀', wing: 'Chaos', color: '#c7a1ff', voice: 'Remix', line: 'Leave room for the impossible.', tones: [46.25, 69.30, 104] },
];

export const PERSONAS = Object.fromEntries(WINGS.map(wing => [wing.id, wing]));
export const TYPE_LABELS = { text: 'Journal', audio: 'Audio', image: 'Photograph', scene: 'Diorama', song: 'Record', video: 'Film' };
export const STATUS_LABELS = { raw: 'Raw', processing: 'Processing', integrated: 'Integrated', myth: 'Myth' };
