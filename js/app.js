/* COSM.OS — app shell
   Multi-chat local archive, persona routing, journal log, and local Ollama layer.
   Local storage remains the source of truth; no account or cloud is required. */

const KEY = 'cosmos_v3';
const $ = selector => document.querySelector(selector);

let state = {
  mode: 'chat',
  lock: null,
  chats: [],
  currentChatId: null,
  entries: [],
  sidebarOpen: true
};
let generating = false;

/* ---------- storage + chat migration ---------- */
function uid(prefix = 'id') {
  if (crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function chatTitle(messages = []) {
  const first = messages.find(message => message.role === 'you' && message.text?.trim());
  if (!first) return 'New chat';
  const clean = first.text.replace(/\s+/g, ' ').trim();
  return clean.length > 42 ? `${clean.slice(0, 42).trim()}…` : clean;
}

function normalizeChat(chat, index = 0) {
  const messages = Array.isArray(chat?.messages) ? chat.messages : [];
  const createdAt = Number(chat?.createdAt) || Number(messages[0]?.ts) || Date.now() + index;
  return {
    id: String(chat?.id || uid('chat')),
    title: String(chat?.title || chatTitle(messages)),
    createdAt,
    updatedAt: Number(chat?.updatedAt) || Number(messages[messages.length - 1]?.ts) || createdAt,
    messages
  };
}

function emptyChat() {
  const now = Date.now();
  return { id: uid('chat'), title: 'New chat', createdAt: now, updatedAt: now, messages: [] };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : {};

    state.mode = data.mode === 'log' ? 'log' : 'chat';
    state.lock = PERSONAS[data.lock] ? data.lock : null;
    state.entries = Array.isArray(data.entries) ? data.entries : [];
    state.sidebarOpen = data.sidebarOpen !== false;

    if (Array.isArray(data.chats) && data.chats.length) {
      state.chats = data.chats.map(normalizeChat);
    } else if (Array.isArray(data.messages) && data.messages.length) {
      state.chats = [normalizeChat({
        id: uid('chat'),
        title: chatTitle(data.messages),
        messages: data.messages,
        createdAt: data.messages[0]?.ts,
        updatedAt: data.messages[data.messages.length - 1]?.ts
      })];
    } else {
      state.chats = [emptyChat()];
    }

    state.currentChatId = state.chats.some(chat => chat.id === data.currentChatId)
      ? data.currentChatId
      : state.chats[0].id;

    migrateEntries(state.entries);
    save();
  } catch (error) {
    console.error(error);
    state.chats = [emptyChat()];
    state.currentChatId = state.chats[0].id;
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (error) { console.error(error); }
}

function currentChat() {
  let chat = state.chats.find(item => item.id === state.currentChatId);
  if (!chat) {
    chat = emptyChat();
    state.chats.unshift(chat);
    state.currentChatId = chat.id;
  }
  return chat;
}

function currentMessages() {
  return currentChat().messages;
}

function touchChat(chat = currentChat()) {
  chat.updatedAt = Date.now();
  if (!chat.title || chat.title === 'New chat') chat.title = chatTitle(chat.messages);
}

function createNewChat() {
  if (generating) return;
  const existing = currentChat();
  if (!existing.messages.length) {
    state.mode = 'chat';
    render();
    $('#input').focus();
    return;
  }

  const chat = emptyChat();
  state.chats.unshift(chat);
  state.currentChatId = chat.id;
  state.mode = 'chat';
  state.lock = null;
  save();
  render();
  paintRail();
  $('#input').focus();
}

function switchChat(id) {
  if (generating || !state.chats.some(chat => chat.id === id)) return;
  state.currentChatId = id;
  state.mode = 'chat';
  save();
  render();
  if (window.innerWidth < 820) setSidebar(false);
  $('#input').focus();
}

function deleteChat(id) {
  if (generating) return;
  const chat = state.chats.find(item => item.id === id);
  if (!chat || !confirm(`Delete “${chat.title}”?`)) return;

  state.chats = state.chats.filter(item => item.id !== id);
  if (!state.chats.length) state.chats = [emptyChat()];
  if (state.currentChatId === id) state.currentChatId = state.chats[0].id;
  save();
  render();
}

function renameChat(id) {
  const chat = state.chats.find(item => item.id === id);
  if (!chat) return;
  const next = prompt('Rename chat', chat.title)?.trim();
  if (!next) return;
  chat.title = next.slice(0, 70);
  touchChat(chat);
  save();
  renderSidebar();
}

/* ---------- helpers ---------- */
const esc = value => {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
};
const stamp = ts => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dayOf = ts => new Date(ts).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
const chatDay = ts => {
  const date = new Date(ts);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'today';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function setGenerating(value) {
  generating = value;
  $('#send').disabled = value;
  $('#input').disabled = value;
  $('#bar').classList.toggle('busy', value);
  $('#newChat').disabled = value;
}

function modelReady() {
  return Boolean(window.COSMOS_AI?.isReady());
}

function compactModelName(id = '') {
  return id
    .replace(/^hf\.co\//i, '')
    .replace(/-q\df\d+_\d+-MLC.*$/i, '')
    .replace(/-Instruct/i, '')
    .replace(/[:/_-]+/g, ' ')
    .trim();
}

/* ---------- sidebar ---------- */
function setSidebar(open) {
  state.sidebarOpen = Boolean(open);
  document.body.classList.toggle('sidebar-open', state.sidebarOpen);
  save();
}

function renderSidebar() {
  const list = $('#chatList');
  if (!list) return;

  const chats = [...state.chats].sort((a, b) => b.updatedAt - a.updatedAt);
  list.innerHTML = chats.map(chat => `
    <div class="chatRow${chat.id === state.currentChatId ? ' active' : ''}" data-id="${esc(chat.id)}">
      <button class="chatOpen" data-id="${esc(chat.id)}" title="${esc(chat.title)}">
        <span class="chatTitle">${esc(chat.title || 'New chat')}</span>
        <time>${chatDay(chat.updatedAt)}</time>
      </button>
      <button class="chatDelete" data-id="${esc(chat.id)}" aria-label="delete chat">×</button>
    </div>`).join('');

  list.querySelectorAll('.chatOpen').forEach(button => {
    button.addEventListener('click', () => switchChat(button.dataset.id));
    button.addEventListener('dblclick', event => {
      event.preventDefault();
      renameChat(button.dataset.id);
    });
  });
  list.querySelectorAll('.chatDelete').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      deleteChat(button.dataset.id);
    });
  });

  $('#currentChatTitle').textContent = currentChat().title || 'New chat';
  document.body.classList.toggle('sidebar-open', state.sidebarOpen);
}

/* ---------- local model ---------- */
function paintModelOptions(modelState) {
  const select = $('#modelSelect');
  if (!select) return;
  const models = Array.isArray(modelState.models) ? modelState.models : [];
  const signature = JSON.stringify(models.map(model => [model.name, model.size]));
  if (select.dataset.signature !== signature) {
    select.dataset.signature = signature;
    select.innerHTML = `<option value="auto">auto · largest Qwen</option>${models.map(model => {
      const gb = model.size ? ` · ${(model.size / 1e9).toFixed(1)} GB` : '';
      return `<option value="${esc(model.name)}">${esc(compactModelName(model.name))}${gb}</option>`;
    }).join('')}`;
  }
  select.value = modelState.selection || 'auto';
  select.disabled = modelState.phase === 'loading' || !models.length;
}

function paintModelStatus(modelState) {
  const box = $('#modelBar');
  const label = $('#modelStatus');
  const button = $('#modelBtn');
  const refresh = $('#modelRefresh');
  if (!box || !label || !button) return;

  box.dataset.phase = modelState.phase;
  button.disabled = false;
  if (refresh) refresh.disabled = modelState.phase === 'loading';
  paintModelOptions(modelState);

  if (modelState.phase === 'loading') {
    const percent = Math.max(0, Math.min(100, Math.round((modelState.progress || 0) * 100)));
    label.textContent = `${percent}% · ${modelState.text || 'loading local model'}`;
    button.textContent = 'loading…';
    button.disabled = true;
  } else if (modelState.phase === 'ready') {
    label.textContent = `local · ${compactModelName(modelState.modelId) || 'ai ready'}`;
    button.textContent = 'ready';
    button.disabled = true;
  } else if (modelState.phase === 'unsupported') {
    label.textContent = 'WebGPU unavailable · deterministic mode active';
    button.textContent = 'unsupported';
    button.disabled = true;
  } else if (modelState.phase === 'error') {
    label.textContent = 'local ai failed · deterministic mode active';
    button.textContent = 'retry';
  } else {
    label.textContent = 'deterministic mode · no model loaded';
    button.textContent = 'load local ai';
  }

  box.title = modelState.error || modelState.modelId || modelState.text || '';
}

async function loadLocalAI() {
  if (!window.COSMOS_AI) return;
  try { await window.COSMOS_AI.load(); } catch (error) { console.error(error); }
}

async function refreshModels() {
  if (!window.COSMOS_AI?.refreshModels) return loadLocalAI();
  try { await window.COSMOS_AI.refreshModels(); } catch (error) { console.error(error); }
}

async function changeModel(value) {
  if (!window.COSMOS_AI?.setModel) return;
  try { await window.COSMOS_AI.setModel(value); } catch (error) { console.error(error); }
}

/* ---------- persona rail ---------- */
function buildRail() {
  const rail = $('#rail');
  rail.innerHTML = ORDER.map(id => {
    const persona = PERSONAS[id];
    return `<button class="chip" data-id="${id}" style="--c:${persona.color}" title="${persona.role}">
      <span class="cg">${persona.glyph}</span><span class="cn">${persona.name}</span></button>`;
  }).join('');
  rail.querySelectorAll('.chip').forEach(button => {
    button.addEventListener('click', () => toggleLock(button.dataset.id));
  });
  paintRail();
}

function paintRail() {
  document.querySelectorAll('.chip').forEach(button => {
    button.classList.toggle('on', button.dataset.id === state.lock);
  });
  const persona = state.lock ? PERSONAS[state.lock] : null;
  $('#lockNote').textContent = persona ? `locked to ${persona.name} — tap again to release` : '';
  document.documentElement.style.setProperty('--live', persona ? persona.color : 'var(--violet)');
}

function toggleLock(id) {
  state.lock = state.lock === id ? null : id;
  save();
  paintRail();
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
  const persona = PERSONAS[personaId] || PERSONAS.flux;
  const custom = window.PERSONA_PROMPTS?.[personaId] || '';
  const memories = relevantMemories(text)
    .map(entry => `- ${new Date(entry.ts).toLocaleDateString()}: ${entry.text}`)
    .join('\n');

  return `You are ${persona.name} ${persona.glyph}, the ${persona.role} voice inside COSM.OS.\n${custom}\nThis message came from the ${surface} surface.\nRelevant local archive entries, use only when genuinely helpful:\n${memories || '- none retrieved'}`;
}

function buildModelMessages(text, personaId, surface) {
  const messages = [{ role: 'system', content: personaSystemPrompt(personaId, text, surface) }];

  if (surface === 'chat') {
    currentMessages().slice(-10).forEach(message => {
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
  const chat = currentChat();
  chat.messages.push({ role: 'you', text, ts: Date.now() });
  touchChat(chat);
  save();
  render();

  const routed = route(text, state.lock);
  if (routed.override || !modelReady()) {
    const reply = await deterministicReply(routed);
    chat.messages.push({ role: 'os', persona: routed.persona, text: reply, ts: Date.now() });
    touchChat(chat);
    save();
    render();
    flash(PERSONAS[routed.persona].color);
    return;
  }

  const request = buildModelMessages(text, routed.persona, 'chat');
  const message = { role: 'os', persona: routed.persona, text: 'thinking locally…', ts: Date.now(), generating: true };
  chat.messages.push(message);
  touchChat(chat);
  setGenerating(true);
  render();

  let frame = null;
  try {
    const finalText = await window.COSMOS_AI.complete(request, partial => {
      message.text = partial || 'thinking locally…';
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        renderChat();
      });
    });
    message.text = finalText || routed.text;
  } catch (error) {
    console.error(error);
    message.text = routed.text;
  } finally {
    if (frame) cancelAnimationFrame(frame);
    delete message.generating;
    setGenerating(false);
    touchChat(chat);
    save();
    render();
    flash(PERSONAS[routed.persona].color);
    $('#input').focus();
  }
}

function renderChat() {
  const col = $('#col');
  const messages = currentMessages();
  if (!messages.length) {
    col.innerHTML = hero('say it plain. it answers in a voice.');
    return;
  }

  col.innerHTML = messages.map(message => {
    if (message.role === 'you') {
      return `<div class="msg you"><div class="bubble">${esc(message.text)}</div></div>`;
    }
    const persona = PERSONAS[message.persona] || PERSONAS.flux;
    return `<div class="msg os${message.generating ? ' generating' : ''}" style="--c:${persona.color}">
      <div class="who"><span class="wg">${persona.glyph}</span>${persona.name}<em>${persona.role}</em></div>
      <div class="bubble">${esc(message.text)}</div></div>`;
  }).join('');

  const scroll = $('#scroll');
  scroll.scrollTop = scroll.scrollHeight;
}

/* ---------- living threads ---------- */
function renderThread(thread) {
  if (!thread) return '';
  const moments = thread.entries.map(item => `
    <li><time>${stamp(item.ts)}</time><p>${esc(item.text)}</p></li>`).join('');

  return `<details class="threadcard">
    <summary>
      <span class="threadglyph">🟠📡</span>
      <span><b>Living Thread</b><em>${esc(thread.title)}</em></span>
      <span class="threadopen">open</span>
    </summary>
    <div class="threadbody"><p class="threadsummary">${esc(thread.summary)}</p><ol>${moments}</ol></div>
  </details>`;
}

/* ---------- log ---------- */
async function sendEntry(text) {
  const routed = route(text, state.lock);
  const ts = Date.now();
  const request = (!routed.override && modelReady()) ? buildModelMessages(text, routed.persona, 'log') : null;
  const entry = {
    id: makeEntryId(ts), text, ts, persona: routed.persona,
    reply: request ? 'thinking locally…' : routed.text,
    threadIds: detectThreads(text, state.entries)
  };

  state.entries.unshift(entry);
  save();
  render();
  flash(PERSONAS[routed.persona].color);
  if (!request) return;

  setGenerating(true);
  try {
    entry.reply = await window.COSMOS_AI.complete(request) || routed.text;
  } catch (error) {
    console.error(error);
    entry.reply = routed.text;
  } finally {
    setGenerating(false);
    save();
    render();
    flash(PERSONAS[routed.persona].color);
    $('#input').focus();
  }
}

function renderLog() {
  const col = $('#col');
  if (!state.entries.length) {
    col.innerHTML = hero('the archive starts when you do.');
    return;
  }

  let lastDay = '';
  col.innerHTML = state.entries.map((entry, index) => {
    const day = dayOf(entry.ts);
    const head = day !== lastDay ? `<div class="daymark">${day}</div>` : '';
    lastDay = day;
    const persona = PERSONAS[entry.persona] || PERSONAS.flux;
    const thread = livingThreadForEntry(entry, state.entries);
    return `${head}<article class="entry" style="--c:${persona.color}">
      <header><time>${stamp(entry.ts)}</time><button class="x" data-i="${index}" aria-label="delete entry">✕</button></header>
      <p>${esc(entry.text)}</p>
      <div class="reply"><span class="rg">${persona.glyph}</span>${esc(entry.reply)}</div>
      ${renderThread(thread)}
    </article>`;
  }).join('');

  col.querySelectorAll('.x').forEach(button => button.addEventListener('click', () => {
    state.entries.splice(+button.dataset.i, 1);
    save();
    render();
  }));
  col.querySelectorAll('.threadcard').forEach(card => card.addEventListener('toggle', () => {
    const label = card.querySelector('.threadopen');
    if (label) label.textContent = card.open ? 'close' : 'open';
  }));
  $('#scroll').scrollTop = 0;
}

function hero(subtitle) {
  return `<div class="hero">
    <div class="mark">🟦🌌🟨</div>
    <h1>COSM.OS</h1>
    <p>${subtitle}</p>
    <p class="tip">call a voice directly, pin one above, or let the router choose. every chat stays local on this machine.</p>
  </div>`;
}

/* ---------- shell ---------- */
function render() {
  $('#input').placeholder = generating
    ? 'local model is thinking…'
    : state.mode === 'chat' ? 'say it plain…' : 'what\'s flowing through you now?';
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('on', tab.dataset.mode === state.mode));
  renderSidebar();
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
  const input = $('#input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  state.mode === 'chat' ? sendChat(text) : sendEntry(text);
}

function exportAll() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `cosmos-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function importAll(file) {
  const reader = new FileReader();
  reader.onload = event => {
    try {
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data.chats) && data.chats.length) {
        state.chats = data.chats.map(normalizeChat);
        state.currentChatId = state.chats[0].id;
      } else if (Array.isArray(data.messages)) {
        const chat = normalizeChat({
          id: uid('chat'),
          title: chatTitle(data.messages),
          messages: data.messages
        });
        state.chats.unshift(chat);
        state.currentChatId = chat.id;
      }
      if (Array.isArray(data.entries)) state.entries = data.entries;
      migrateEntries(state.entries);
      state.mode = 'chat';
      save();
      render();
    } catch (error) {
      alert('That file is not a COSM.OS backup.');
    }
  };
  reader.readAsText(file);
}

/* ---------- wiring ---------- */
load();
buildRail();
render();

if (window.COSMOS_AI) {
  window.COSMOS_AI.subscribe(paintModelStatus);
  $('#modelBtn').addEventListener('click', loadLocalAI);
  $('#modelRefresh').addEventListener('click', refreshModels);
  $('#modelSelect').addEventListener('change', event => changeModel(event.target.value));
} else {
  paintModelStatus({ phase: 'error', text: 'model layer unavailable', error: 'model scripts did not load', models: [] });
}

$('#sidebarToggle').addEventListener('click', () => setSidebar(!state.sidebarOpen));
$('#sidebarClose').addEventListener('click', () => setSidebar(false));
$('#newChat').addEventListener('click', createNewChat);
$('#sidebarShade').addEventListener('click', () => setSidebar(false));

$('#input').addEventListener('input', event => {
  event.target.style.height = 'auto';
  event.target.style.height = `${Math.min(140, event.target.scrollHeight)}px`;
});
$('#input').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    submit();
  }
});
$('#send').addEventListener('click', submit);
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  if (generating) return;
  state.mode = tab.dataset.mode;
  save();
  render();
}));
$('#export').addEventListener('click', exportAll);
$('#importBtn').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', event => {
  if (event.target.files[0]) importAll(event.target.files[0]);
  event.target.value = '';
});

window.addEventListener('resize', () => {
  if (window.innerWidth >= 820) document.body.classList.toggle('sidebar-open', state.sidebarOpen);
});

if ('serviceWorker' in navigator && !window.COSMOS_DESKTOP) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
