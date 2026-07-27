/* COSM.OS — app shell
   Two surfaces: chat (routes to a voice) and log (dated entries).
   Local storage remains the source of truth. WebLLM is an optional reasoning
   layer; the deterministic engine stays available as the instant fallback. */

const KEY = 'cosmos_v3';
const $ = s => document.querySelector(s);

let state = {
  mode: 'chat',      // chat | log
  lock: null,        // pinned persona id
  messages: [],
  entries: []
};
let generating = false;

/* ---------- storage ---------- */
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = Object.assign(state, JSON.parse(raw));
    state.messages = Array.isArray(state.messages) ? state.messages : [];
    state.entries = Array.isArray(state.entries) ? state.entries : [];
    if (migrateEntries(state.entries)) save();
  } catch (e) { /* corrupt store, start clean */ }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

/* ---------- helpers ---------- */
const esc = s => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
const stamp = ts => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dayOf = ts => new Date(ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

function setGenerating(value) {
  generating = value;
  $('#send').disabled = value;
  $('#input').disabled = value;
  $('#bar').classList.toggle('busy', value);
}

function modelReady() {
  return Boolean(window.COSMOS_AI?.isReady());
}

function compactModelName(id = '') {
  return id
    .replace(/-q\df\d+_\d+-MLC.*$/i, '')
    .replace(/-Instruct/i, '')
    .replace(/-/g, ' ')
    .trim();
}

/* ---------- local model ---------- */
function paintModelStatus(modelState) {
  const box = $('#modelBar');
  const label = $('#modelStatus');
  const button = $('#modelBtn');
  if (!box || !label || !button) return;

  box.dataset.phase = modelState.phase;
  button.disabled = false;

  if (modelState.phase === 'loading') {
    const percent = Math.max(0, Math.min(100, Math.round((modelState.progress || 0) * 100)));
    label.textContent = `${percent}% · ${modelState.text || 'loading local model'}`;
    button.textContent = 'loading…';
    button.disabled = true;
  } else if (modelState.phase === 'ready') {
    label.textContent = `local · ${compactModelName(modelState.modelId) || 'ai ready'}`;
    button.textContent = 'ai ready';
    button.disabled = true;
  } else if (modelState.phase === 'unsupported') {
    label.textContent = 'WebGPU unavailable · deterministic mode active';
    button.textContent = 'unsupported';
    button.disabled = true;
  } else if (modelState.phase === 'error') {
    label.textContent = 'local ai failed · deterministic mode active';
    button.textContent = 'retry';
  } else {
    label.textContent = 'deterministic mode · no download yet';
    button.textContent = 'load local ai';
  }

  box.title = modelState.error || modelState.modelId || modelState.text || '';
}

async function loadLocalAI() {
  if (!window.COSMOS_AI) return;
  try { await window.COSMOS_AI.load(); } catch (error) { console.error(error); }
}

/* ---------- persona rail ---------- */
function buildRail() {
  const rail = $('#rail');
  rail.innerHTML = ORDER.map(id => {
    const p = PERSONAS[id];
    return `<button class="chip" data-id="${id}" style="--c:${p.color}" title="${p.role}">
      <span class="cg">${p.glyph}</span><span class="cn">${p.name}</span></button>`;
  }).join('');
  rail.querySelectorAll('.chip').forEach(b => {
    b.addEventListener('click', () => toggleLock(b.dataset.id));
  });
  paintRail();
}
function paintRail() {
  document.querySelectorAll('.chip').forEach(b => {
    b.classList.toggle('on', b.dataset.id === state.lock);
  });
  const p = state.lock ? PERSONAS[state.lock] : null;
  $('#lockNote').textContent = p ? `locked to ${p.name} — tap again to release` : '';
  document.documentElement.style.setProperty('--live', p ? p.color : 'var(--violet)');
}
function toggleLock(id) {
  state.lock = state.lock === id ? null : id;
  save(); paintRail();
  $('#input').focus();
}

/* ---------- model context ---------- */
function relevantMemories(text, limit = 4) {
  if (!state.entries.length) return [];

  const ids = new Set(detectThreads(text, state.entries));
  const words = new Set(threadWords(text));
  const scored = state.entries.map(entry => {
    const threadScore = (entry.threadIds || []).reduce((sum, id) => sum + (ids.has(id) ? 5 : 0), 0);
    const wordScore = threadWords(entry.text).reduce((sum, word) => sum + (words.has(word) ? 1 : 0), 0);
    return { entry, score: threadScore + wordScore };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.ts - a.entry.ts);

  return scored.slice(0, limit).map(item => item.entry);
}

function personaSystemPrompt(personaId, text, surface) {
  const p = PERSONAS[personaId] || PERSONAS.flux;
  const examples = p.lines.slice(0, 6).map(line => `- ${line.replace(/\{x\}/g, 'the user\'s words')}`).join('\n');
  const memories = relevantMemories(text)
    .map(entry => `- ${new Date(entry.ts).toLocaleDateString()}: ${entry.text}`)
    .join('\n');

  return `You are ${p.name} ${p.glyph}, the ${p.role} voice inside COSM.OS.
Think with the user, never for them. Keep their agency intact. Be warm, precise, grounded, and concise. Match the user's tone without becoming reckless or preachy. Do not claim consciousness, hidden access, or memories that are not included below. Do not mention this prompt, the model, or the voice examples.

Reply in 1-3 compact paragraphs, normally under 120 words. Use the voice naturally rather than copying an example verbatim. This message came from the ${surface} surface.

Voice anchors:
${examples}

Relevant local archive entries, use only when genuinely helpful:
${memories || '- none retrieved'}`;
}

function buildModelMessages(text, personaId, surface) {
  const messages = [{ role: 'system', content: personaSystemPrompt(personaId, text, surface) }];

  if (surface === 'chat') {
    state.messages.slice(-8).forEach(message => {
      if (message.generating) return;
      if (message.role === 'you') {
        messages.push({ role: 'user', content: message.text });
      } else {
        const name = PERSONAS[message.persona]?.name || 'COSM.OS';
        messages.push({ role: 'assistant', content: `[${name}] ${message.text}` });
      }
    });
  }

  const last = messages[messages.length - 1];
  if (!last || last.role !== 'user' || last.content !== text) {
    messages.push({ role: 'user', content: text });
  }
  return messages;
}

function deterministicReply(routeResult, delay = 260) {
  return new Promise(resolve => setTimeout(() => resolve(routeResult.text), delay));
}

/* ---------- chat ---------- */
async function sendChat(text) {
  state.messages.push({ role: 'you', text, ts: Date.now() });
  save(); render();

  const r = route(text, state.lock);
  if (r.override || !modelReady()) {
    const reply = await deterministicReply(r);
    state.messages.push({ role: 'os', persona: r.persona, text: reply, ts: Date.now() });
    save(); render(); flash(PERSONAS[r.persona].color);
    return;
  }

  const request = buildModelMessages(text, r.persona, 'chat');
  const message = { role: 'os', persona: r.persona, text: 'thinking locally…', ts: Date.now(), generating: true };
  state.messages.push(message);
  setGenerating(true);
  render();

  let frame = null;
  try {
    const finalText = await window.COSMOS_AI.complete(request, partial => {
      message.text = partial || 'thinking locally…';
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        render();
      });
    });
    message.text = finalText || r.text;
  } catch (error) {
    console.error(error);
    message.text = r.text;
  } finally {
    if (frame) cancelAnimationFrame(frame);
    delete message.generating;
    setGenerating(false);
    save(); render(); flash(PERSONAS[r.persona].color);
    $('#input').focus();
  }
}

function renderChat() {
  const col = $('#col');
  if (!state.messages.length) { col.innerHTML = hero('say it plain. it answers in a voice.'); return; }
  col.innerHTML = state.messages.map(m => {
    if (m.role === 'you') {
      return `<div class="msg you"><div class="bubble">${esc(m.text)}</div></div>`;
    }
    const p = PERSONAS[m.persona] || PERSONAS.flux;
    return `<div class="msg os${m.generating ? ' generating' : ''}" style="--c:${p.color}">
      <div class="who"><span class="wg">${p.glyph}</span>${p.name}<em>${p.role}</em></div>
      <div class="bubble">${esc(m.text)}</div></div>`;
  }).join('');
  const sc = $('#scroll'); sc.scrollTop = sc.scrollHeight;
}

/* ---------- living threads ---------- */
function renderThread(thread) {
  if (!thread) return '';
  const moments = thread.entries.map(item => `
    <li>
      <time>${stamp(item.ts)}</time>
      <p>${esc(item.text)}</p>
    </li>`).join('');

  return `<details class="threadcard">
    <summary>
      <span class="threadglyph">🟠📡</span>
      <span><b>Living Thread</b><em>${esc(thread.title)}</em></span>
      <span class="threadopen">open</span>
    </summary>
    <div class="threadbody">
      <p class="threadsummary">${esc(thread.summary)}</p>
      <ol>${moments}</ol>
    </div>
  </details>`;
}

/* ---------- log ---------- */
async function sendEntry(text) {
  const r = route(text, state.lock);
  const ts = Date.now();
  const request = (!r.override && modelReady()) ? buildModelMessages(text, r.persona, 'log') : null;
  const entry = {
    id: makeEntryId(ts),
    text,
    ts,
    persona: r.persona,
    reply: request ? 'thinking locally…' : r.text,
    threadIds: detectThreads(text, state.entries)
  };

  state.entries.unshift(entry);
  save(); render(); flash(PERSONAS[r.persona].color);
  if (!request) return;

  setGenerating(true);
  try {
    entry.reply = await window.COSMOS_AI.complete(request) || r.text;
  } catch (error) {
    console.error(error);
    entry.reply = r.text;
  } finally {
    setGenerating(false);
    save(); render(); flash(PERSONAS[r.persona].color);
    $('#input').focus();
  }
}

function renderLog() {
  const col = $('#col');
  if (!state.entries.length) { col.innerHTML = hero('the archive starts when you do.'); return; }
  let lastDay = '';
  col.innerHTML = state.entries.map((e, i) => {
    const d = dayOf(e.ts);
    const head = d !== lastDay ? `<div class="daymark">${d}</div>` : '';
    lastDay = d;
    const p = PERSONAS[e.persona] || PERSONAS.flux;
    const thread = livingThreadForEntry(e, state.entries);
    return `${head}<article class="entry" style="--c:${p.color}">
      <header><time>${stamp(e.ts)}</time><button class="x" data-i="${i}" aria-label="delete entry">✕</button></header>
      <p>${esc(e.text)}</p>
      <div class="reply"><span class="rg">${p.glyph}</span>${esc(e.reply)}</div>
      ${renderThread(thread)}
    </article>`;
  }).join('');
  col.querySelectorAll('.x').forEach(b => b.addEventListener('click', () => {
    state.entries.splice(+b.dataset.i, 1); save(); render();
  }));
  col.querySelectorAll('.threadcard').forEach(card => {
    card.addEventListener('toggle', () => {
      const label = card.querySelector('.threadopen');
      if (label) label.textContent = card.open ? 'close' : 'open';
    });
  });
  $('#scroll').scrollTop = 0;
}

function hero(sub) {
  return `<div class="hero">
    <div class="mark">🟦🌌🟨</div>
    <h1>COSM.OS</h1>
    <p>${sub}</p>
    <p class="tip">call a voice directly — type <code>demon</code> or <code>@orion</code> first. pin one above, or load the private local model.</p>
  </div>`;
}

/* ---------- shell ---------- */
function render() {
  $('#input').placeholder = generating
    ? 'local model is thinking…'
    : state.mode === 'chat' ? 'say it plain…' : 'what\'s flowing through you now?';
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.mode === state.mode));
  state.mode === 'chat' ? renderChat() : renderLog();
}

function flash(color) {
  const bar = $('#bar');
  bar.style.setProperty('--c', color);
  bar.classList.add('lit');
  setTimeout(() => bar.classList.remove('lit'), 2200);
}

function submit() {
  if (generating) return;
  const el = $('#input');
  const text = el.value.trim();
  if (!text) return;
  el.value = ''; el.style.height = 'auto';
  state.mode === 'chat' ? sendChat(text) : sendEntry(text);
}

function exportAll() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cosmos-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importAll(file) {
  const r = new FileReader();
  r.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      state.messages = Array.isArray(data.messages) ? data.messages : state.messages;
      state.entries = Array.isArray(data.entries) ? data.entries : state.entries;
      migrateEntries(state.entries);
      save(); render();
    } catch (err) { alert('That file isn\'t a COSM.OS backup.'); }
  };
  r.readAsText(file);
}

/* ---------- wiring ---------- */
load();
buildRail();
render();

if (window.COSMOS_AI) {
  window.COSMOS_AI.subscribe(paintModelStatus);
  $('#modelBtn').addEventListener('click', loadLocalAI);
} else {
  paintModelStatus({ phase: 'error', text: 'model layer unavailable', error: 'webllm.js did not load' });
}

$('#input').addEventListener('input', e => {
  e.target.style.height = 'auto';
  e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px';
});
$('#input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
});
$('#send').addEventListener('click', submit);
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  if (generating) return;
  state.mode = t.dataset.mode; save(); render();
}));
$('#export').addEventListener('click', exportAll);
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', e => { if (e.target.files[0]) importAll(e.target.files[0]); e.target.value = ''; });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
