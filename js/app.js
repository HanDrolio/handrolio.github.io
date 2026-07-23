/* COSM.OS — app shell
   Two surfaces: chat (routes to a voice) and log (dated entries).
   Everything in localStorage. Nothing leaves the device. */

const KEY = 'cosmos_v3';
const $ = s => document.querySelector(s);

let state = {
  mode: 'chat',      // chat | log
  lock: null,        // pinned persona id
  messages: [],
  entries: []
};

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

/* ---------- chat ---------- */
function sendChat(text) {
  state.messages.push({ role: 'you', text, ts: Date.now() });
  render();
  const r = route(text, state.lock);
  setTimeout(() => {
    state.messages.push({ role: 'os', persona: r.persona, text: r.text, ts: Date.now() });
    save(); render(); flash(PERSONAS[r.persona].color);
  }, 260);
}

function renderChat() {
  const col = $('#col');
  if (!state.messages.length) { col.innerHTML = hero('say it plain. it answers in a voice.'); return; }
  col.innerHTML = state.messages.map(m => {
    if (m.role === 'you') {
      return `<div class="msg you"><div class="bubble">${esc(m.text)}</div></div>`;
    }
    const p = PERSONAS[m.persona];
    return `<div class="msg os" style="--c:${p.color}">
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
function sendEntry(text) {
  const r = route(text, state.lock);
  const ts = Date.now();
  state.entries.unshift({
    id: makeEntryId(ts),
    text,
    ts,
    persona: r.persona,
    reply: r.text,
    threadIds: detectThreads(text, state.entries)
  });
  save(); render(); flash(PERSONAS[r.persona].color);
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
    <p class="tip">call a voice directly — type <code>demon</code> or <code>@orion</code> first. or pin one above.</p>
  </div>`;
}

/* ---------- shell ---------- */
function render() {
  $('#input').placeholder = state.mode === 'chat' ? 'say it plain…' : 'what\'s flowing through you now?';
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

$('#input').addEventListener('input', e => {
  e.target.style.height = 'auto';
  e.target.style.height = Math.min(140, e.target.scrollHeight) + 'px';
});
$('#input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
});
$('#send').addEventListener('click', submit);
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
  state.mode = t.dataset.mode; save(); render();
}));
$('#export').addEventListener('click', exportAll);
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', e => { if (e.target.files[0]) importAll(e.target.files[0]); e.target.value = ''; });

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
