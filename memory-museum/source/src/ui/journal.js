import { WINGS, PERSONAS, STATUS_LABELS, TYPE_LABELS } from '../personas/personas.js';
import { button, escapeHTML as esc } from './panel.js';

export function personaOptions(current = 'echo') {
  return WINGS.map(wing => `<option value="${wing.id}"${wing.id === current ? ' selected' : ''}>${wing.name} · ${wing.wing}</option>`).join('');
}

export function archiveRows(memories, date, includeSealed = false) {
  return memories.length ? memories.map(memory => {
    const title = esc(memory.title);
    const wing = PERSONAS[memory.persona]?.wing || 'Memory';
    const status = STATUS_LABELS[memory.integration_status] || 'Raw';
    const availability = memory.availableOn && memory.availableOn > date ? ` · Exhibits ${memory.availableOn}` : '';
    const label = `${wing} · ${TYPE_LABELS[memory.type]} · ${status}${availability}${memory.demo ? ' · Sample' : ''}`;
    return `<button type="button" class="archive-item" data-do="memory" data-id="${esc(memory.id)}" data-filter="${esc(`${memory.title} ${label} ${memory.emotion_tags.join(' ')}`.toLowerCase())}">
      <strong>${title}</strong><small>${esc(includeSealed ? 'Sealed · ' + label : label)}</small></button>`;
  }).join('') : '<p class="hint">This shelf is empty.</p>';
}

export function journalBody(tab, memories, persona, date, canPersist) {
  const tabs = [['archive', 'Archive'], ['write', 'New entry'], ['import', 'Import']];
  const nav = `<nav class="tabs" aria-label="Notebook pages">${tabs.map(([key, label]) =>
    `<button type="button" data-do="tab" data-id="${key}"${tab === key ? ' aria-current="page"' : ''}>${label}</button>`).join('')}</nav>`;
  const storage = canPersist ? 'Entries and media stay in this browser.' : 'Storage is unavailable. Entries last until you leave this page.';
  if (tab === 'archive') return nav + `<p class="panel-copy">${storage} The museum starts with fictional exhibits.</p>
    <input class="field archive-filter" type="search" aria-label="Search archive" placeholder="Search titles, wings, or tags">
    <div class="archive-list">${archiveRows(memories, date)}</div>`;
  if (tab === 'write') return nav + `<p class="panel-copy">Give a memory a title and a home wing. Add a local file for a media exhibit.</p>
    <form data-form="memory">
    <div class="form-grid">
      <label class="wide">Title <input class="field" name="title" maxlength="90" placeholder="An ordinary thing worth keeping"></label>
      <label>Home wing <select name="persona">${personaOptions(persona)}</select></label>
      <label>Exhibit type <select name="type">${Object.entries(TYPE_LABELS).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label>
      <label>Emotion tags <input class="field" name="emotion_tags" maxlength="140" placeholder="joy, nostalgia"></label>
      <label>Intensity <input class="field" name="intensity" type="number" min="1" max="10" value="5"></label>
      <label class="wide">Entry <textarea name="content" maxlength="24000" placeholder="Write what you remember."></textarea></label>
      <label id="journal-media" class="wide" hidden>Local media file <input class="field" type="file" name="media" accept="image/*,audio/*,video/*"></label>
      <label class="wide check-row"><input type="checkbox" name="sealed"> File in the sealed Basement archive</label>
    </div><p class="form-error" role="alert"></p>
    <button type="submit" class="button primary">Save exhibit</button></form>`;
  return nav + `<p class="panel-copy">Import TXT, Markdown, JSON, JSONL, or a ChatGPT conversation export. The halls make room for up to three arrivals each day. You can read queued entries here at any time.</p>
    <form data-form="import" class="form-grid"><label class="wide">Journal or chat file <input class="field" type="file" name="journal" accept=".txt,.md,.json,.jsonl,text/plain,application/json" required></label>
    <label>Home wing for plain text <select name="persona">${personaOptions(persona)}</select></label>
    <div class="wide"><p class="form-error" role="alert"></p><button type="submit" class="button primary">Import entries</button></div></form>
    <p class="hint">${storage} JSON media links are skipped. To attach a file, create a media exhibit in New entry.</p>`;
}

export function setupJournal(panel) {
  const filter = panel.find('.archive-filter');
  if (filter) filter.addEventListener('input', () => {
    const query = filter.value.trim().toLowerCase();
    for (const item of panel.dialog.querySelectorAll('[data-filter]')) item.hidden = !item.dataset.filter.includes(query);
  });
  const type = panel.find('select[name=type]');
  if (type) type.addEventListener('change', () => {
    const media = panel.find('#journal-media');
    const file = media.querySelector('input');
    media.hidden = !['image', 'audio', 'video', 'song'].includes(type.value);
    file.required = !media.hidden;
    file.accept = type.value === 'song' || type.value === 'audio' ? 'audio/*' : `${type.value}/*`;
    file.value = '';
  });
}

function mediaMarkup(memory) {
  if (memory.type === 'scene') return `<div class="actions">${button('Enter the diorama', 'scene', { kind: 'primary' })}</div>`;
  if (memory.asset || memory.hasMedia) return '<div class="media-box" data-media aria-live="polite">Opening media…</div>';
  if (memory.type === 'audio' || memory.type === 'song') {
    return `<div class="media-box synthetic"><span class="media-symbol" aria-hidden="true">${memory.type === 'song' ? '◎' : '∿'}</span>
      ${button('Play recording', 'track')}${memory.type === 'song' ? button('Scratch record', 'scratch') : ''}</div>`;
  }
  return '';
}

export function exhibitBody(memory, persona, listed) {
  const tags = memory.emotion_tags.map(tag => `<span class="pill">${esc(tag)}</span>`).join('');
  const date = new Date(memory.timestamp);
  const dateLabel = Number.isFinite(+date) ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Undated';
  const open = memory.integration_status === 'raw' || memory.integration_status === 'processing';
  return `<div class="exhibit-meta"><span class="pill ${memory.integration_status}">${STATUS_LABELS[memory.integration_status]}</span>
    <span class="pill">${TYPE_LABELS[memory.type]} · ${esc(dateLabel)}</span>
    <span class="pill">Intensity ${memory.intensity}/10</span>${tags}${memory.demo ? '<span class="pill">Fictional sample</span>' : ''}</div>
    ${memory.content ? `<p class="memory-body">${esc(memory.content)}</p>` : ''}
    ${mediaMarkup(memory)}
    <div class="actions">${open ? '<button type="button" class="button hold" data-do="hold">Hold to integrate · 3s</button>' : ''}
      ${button('Add note', 'note')}${button(`${persona.voice} · ${persona.name}`, 'perspective')}
      ${listed ? button('Previous', 'previous') + button('Next', 'next') : ''}</div>
    ${open ? '<p class="hint">Hold A, E, or the button to turn this exhibit gold.</p>' : ''}
    ${memory.notes?.length ? `<hr class="divider"><span class="eyebrow">Curator notes</span>${memory.notes.map(note => `<p class="note">${esc(note.text)}</p>`).join('')}` : ''}
    ${memory.demo ? '' : `<div class="actions">${button('Remove exhibit', 'remove', { kind: 'quiet danger' })}</div>`}`;
}

export function perspectiveBody(memory, persona, archive) {
  if (persona.id === 'orion') {
    const same = archive.filter(item => item.id !== memory.id && item.sealed === memory.sealed && item.emotion_tags.some(tag => memory.emotion_tags.includes(tag))).slice(0, 6);
    return `<p class="panel-copy">Connections are drawn from shared emotion tags.</p>
      ${same.length ? `<div class="archive-list">${archiveRows(same, '')}</div>` : '<p class="memory-body">This exhibit has no matching tags elsewhere in the archive.</p>'}`;
  }
  if (persona.id === 'astro') {
    return `<p class="memory-body">Take one detail from this memory and give it your full attention. A sound, a color, the way the air felt.</p>${button('Write down the detail', 'note')}`;
  }
  if (persona.id === 'ripple') {
    return '<p class="panel-copy">Breathe at a comfortable pace. The ring takes four seconds to expand and four to settle.</p><div class="breath-ring" aria-hidden="true"></div>';
  }
  if (persona.id === 'brix') {
    return `<p class="panel-copy">Three steady lifts. Set the memory down between each one.</p>
      <p class="memory-body" id="lift-count">0 / 3</p>${button('Lift', 'lift', { kind: 'primary' })}`;
  }
  if (persona.id === 'demon') {
    return `<p class="memory-body">Give the situation a punchline, if it has one. The subject of the joke is yours to choose.</p>${button('Write a punchline', 'note')}`;
  }
  if (persona.id === 'hermes') {
    if (memory.sealed) return '<p class="panel-copy">This entry is filed in the sealed archive. Its story stays here.</p>';
    if (memory.integration_status === 'myth') return '<p class="memory-body">This exhibit already has a place among the stories.</p>';
    if (memory.integration_status !== 'integrated') return '<p class="memory-body">Integrate this exhibit to turn it into a story for the Hermes Wing.</p>';
    return `<p class="panel-copy">Write an opening line and leave a story copy in Hermes.</p>
    <form data-form="myth"><label class="stack-label">Opening line <textarea name="line" maxlength="1000" placeholder="Once, there was…"></textarea></label>
    <p class="form-error" role="alert"></p><button type="submit" class="button primary">Create story exhibit</button></form>`;
  }
  if (persona.id === 'echo') {
    return `<p class="panel-copy">Read this entry in sequence, one line at a time.</p><p class="memory-body" id="replay-line"></p>
      <div class="actions">${button('Previous line', 'replay-prev')}${button('Next line', 'replay-next', { kind: 'primary' })}${button('Back to exhibit', 'close')}</div>`;
  }
  if (memory.sealed) return '<p class="panel-copy">The sealed exhibit stays in its own room.</p>';
  const candidates = archive.filter(item => !item.sealed && item.id !== memory.id).slice(0, 250);
  if (!candidates.length) return '<p class="panel-copy">Add a second exhibit to make a remix.</p>';
  return `<p class="panel-copy">Pair two memories and write what connects them. The museum will create a new Flux exhibit.</p>
  <form data-form="remix"><label class="stack-label">Second exhibit <select name="second">
  ${candidates.map(item => `<option value="${esc(item.id)}">${esc(item.title)}</option>`).join('')}</select></label>
  <label class="stack-label">Connection <textarea name="line" maxlength="1000" placeholder="What changes when these sit together?"></textarea></label>
  <p class="form-error" role="alert"></p><button type="submit" class="button primary">Create remix</button></form>`;
}
