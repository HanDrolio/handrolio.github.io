/* COSM.OS — minimalist app shell v0.7
   Selected persona + tiny raw context in chat, one-shot reflection in log,
   and deterministic commands only when explicitly invoked. */

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

function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
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
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (error) { console.error(error); }
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

function currentMessages() { return currentChat().messages; }

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
  save();
  render();
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
  return date.toDateString() === today.toDateString()
    ? 'today'
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function clip(value, length = 180) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  return clean.length > length ? `${clean.slice(0, length).trim()}…` : clean;
}

function setGenerating(value) {
  generating = value;
  $('#send').disabled = value;
  $('#input').disabled = value;
  $('#bar').classList.toggle('busy', value);
  $('#newChat').disabled = value;
}

function modelReady() { return Boolean(window.COSMOS_AI?.isReady()); }

function compactModelName(id = '') {
  return id
    .replace(/^hf\.co\//i, '')
    .replace(/-q\d+_\d+-MLC.*$/i, '')
    .replace(/-Instruct/i, '')
    .replace(/[:/_-]+/g, ' ')
    .trim();
}

function activePersona(surface = state.mode) {
  if (state.lock && PERSONAS[state.lock]) return state.lock;
  return surface === 'log' ? 'ripple' : 'flux';
}

function unavailableReply() {
  return 'local model unavailable. start Ollama or press ↻, then try again.';
}

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
    label.textContent = 'local model unavailable';
    button.textContent = 'unsupported';
    button.disabled = true;
  } else if (modelState.phase === 'error') {
    label.textContent = 'local model unavailable';
    button.textContent = 'retry';
  } else {
    label.textContent = 'checking local models…';
    button.textContent = 'load local ai';
  }
  box.title = modelState.error || modelState.modelId || modelState.text || '';
}

async function loadLocalAI() {
  if (!window.COSMOS_AI) return;
  try { await window.COSMOS_AI.load(); }
  catch (error) { console.error(error); }
}
async function refreshModels() {
  if (!window.COSMOS_AI?.refreshModels) return loadLocalAI();
  try { await window.COSMOS_AI.refreshModels(); }
  catch (error) { console.error(error); }
}
async function changeModel(value) {
  if (!window.COSMOS_AI?.setModel) return;
  try { await window.COSMOS_AI.setModel(value); }
  catch (error) { console.error(error); }
}

function buildRail() {
  const rail = $('#rail');
  rail.innerHTML = ORDER.map(id => {
    const persona = PERSONAS[id];
    return `<button class="chip" data-id="${id}" style="--c:${persona.color}" title="${persona.role}">
      <span class="cg">${persona.glyph}</span><span class="cn">${persona.name}</span>
    </button>`;
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
  const personaId = activePersona();
  const persona = PERSONAS[personaId];
  $('#lockNote').textContent = state.lock
    ? `selected · ${persona.name} — tap again for mode default`
    : `default · ${persona.name}`;
  document.documentElement.style.setProperty('--live', persona.color);
}

function toggleLock(id) {
  state.lock = state.lock === id ? null : id;
  save();
  paintRail();
  $('#input').focus();
}

function personaSystemPrompt(personaId) {
  return window.PERSONA_PROMPTS?.[personaId] || window.PERSONA_PROMPTS?.flux || '';
}

function buildModelMessages(text, personaId, surface, chat = currentChat()) {
  const messages = [{ role: 'system', content: personaSystemPrompt(personaId) }];
  if (surface === 'chat') {
    const prior = chat.messages
      .slice(0, -1)
      .filter(message => !message.generating)
      .slice(-6);
    prior.forEach(message => {
      messages.push({
        role: message.role === 'you' ? 'user' : 'assistant',
        content: String(message.text || '')
      });
    });
  }
  messages.push({ role: 'user', content: text });
  return messages;
}

function parseCommand(text) {
  const match = String(text || '').trim().match(/^\/?(remember|summary|plan)(?:\s+([\s\S]*))?$/i);
  if (!match) return null;
  return { name: match[1].toLowerCase(), body: String(match[2] || '').trim() };
}

function recentUserText(chat = currentChat()) {
  return [...chat.messages]
    .reverse()
    .find(message => message.role === 'you' && !parseCommand(message.text))?.text || '';
}

function deterministicSummary(chat = currentChat()) {
  const transcript = chat.messages
    .filter(message => !message.generating)
    .slice(-6)
    .map(message => `${message.role === 'you' ? 'you' : 'cosm.os'}: ${clip(message.text, 150)}`);
  if (!transcript.length) return 'LOGICAL BOOKMARK\nnothing to summarize yet.';
  return [
    'LOGICAL BOOKMARK',
    `thread: ${chat.title || 'New chat'}`,
    ...transcript,
    `continue from: ${clip(recentUserText(chat), 120) || 'the current thread'}`
  ].join('\n');
}

function deterministicPlan(goal) {
  const target = clip(goal, 180);
  if (!target) return 'usage: plan <goal>';
  return [
    `PLAN — ${target}`,
    '1. define what “done” looks like in one sentence.',
    '2. run the smallest test that produces real evidence.',
    '3. inspect the result, then choose one next move.'
  ].join('\n');
}

function saveRememberedNote(body) {
  const text = String(body || '').trim();
  if (!text) return null;
  const ts = Date.now();
  const entry = {
    id: makeEntryId(ts),
    text,
    ts,
    persona: 'echo',
    reply: 'remembered locally.',
    threadIds: detectThreads(text, state.entries)
  };
  state.entries.unshift(entry);
  return entry;
}

function commandResult(command) {
  if (command.name === 'remember') {
    if (!command.body) return { persona: 'echo', text: 'usage: remember <exact note>' };
    saveRememberedNote(command.body);
    return { persona: 'echo', text: `remembered locally: ${clip(command.body, 180)}` };
  }
  if (command.name === 'summary') {
    return { persona: 'echo', text: deterministicSummary(currentChat()) };
  }
  const goal = command.body || recentUserText(currentChat());
  return { persona: 'orion', text: deterministicPlan(goal) };
}

function runCommand(text, command) {
  const result = commandResult(command);
  if (state.mode === 'chat') {
    const chat = currentChat();
    chat.messages.push({ role: 'you', text, ts: Date.now() });
    chat.messages.push({ role: 'os', persona: result.persona, text: result.text, ts: Date.now() });
    touchChat(chat);
  } else if (!(command.name === 'remember' && command.body)) {
    const ts = Date.now();
    state.entries.unshift({
      id: makeEntryId(ts),
      text,
      ts,
      persona: result.persona,
      reply: result.text,
      threadIds: detectThreads(text, state.entries)
    });
  }
  save();
  render();
  flash(PERSONAS[result.persona].color);
  $('#input').focus();
}

async function sendChat(text) {
  const chat = currentChat();
  const personaId = activePersona('chat');
  chat.messages.push({ role: 'you', text, ts: Date.now() });
  touchChat(chat);
  save();
  render();

  if (!modelReady()) {
    chat.messages.push({ role: 'os', persona: personaId, text: unavailableReply(), ts: Date.now() });
    touchChat(chat);
    save();
    render();
    flash(PERSONAS[personaId].color);
    return;
  }

  const request = buildModelMessages(text, personaId, 'chat', chat);
  const message = { role: 'os', persona: personaId, text: 'thinking locally…', ts: Date.now(), generating: true };
  chat.messages.push(message);
  touchChat(chat);
  setGenerating(true);
  render();

  try {
    message.text = await window.COSMOS_AI.complete(request) || unavailableReply();
  } catch (error) {
    console.error(error);
    message.text = unavailableReply();
  } finally {
    delete message.generating;
    setGenerating(false);
    touchChat(chat);
    save();
    render();
    flash(PERSONAS[personaId].color);
    $('#input').focus();
  }
}

function renderChat() {
  const col = $('#col');
  const messages = currentMessages();
  if (!messages.length) {
    col.innerHTML = hero('select a voice or let Flux talk.');
    return;
  }
  col.innerHTML = messages.map(message => {
    if (message.role === 'you') {
      return `<div class="msg you"><div class="bubble">${esc(message.text)}</div></div>`;
    }
    const persona = PERSONAS[message.persona] || PERSONAS.flux;
    return `<div class="msg os${message.generating ? ' generating' : ''}" style="--c:${persona.color}">
      <div class="who"><span class="wg">${persona.glyph}</span>${persona.name}<em>${persona.role}</em></div>
      <div class="bubble">${esc(message.text)}</div>
    </div>`;
  }).join('');
  const scroll = $('#scroll');
  scroll.scrollTop = scroll.scrollHeight;
}

function renderThread(thread) {
  if (!thread) return '';
  const moments = thread.entries
    .map(item => `<li><time>${stamp(item.ts)}</time><p>${esc(item.text)}</p></li>`)
    .join('');
  return `<details class="threadcard">
    <summary>
      <span class="threadglyph">🟠📡</span>
      <span><b>Living Thread</b><em>${esc(thread.title)}</em></span>
      <span class="threadopen">open</span>
    </summary>
    <div class="threadbody"><p class="threadsummary">${esc(thread.summary)}</p><ol>${moments}</ol></div>
  </details>`;
}

async function sendEntry(text) {
  const personaId = activePersona('log');
  const ts = Date.now();
  const entry = {
    id: makeEntryId(ts),
    text,
    ts,
    persona: personaId,
    reply: modelReady() ? 'thinking locally…' : unavailableReply(),
    threadIds: detectThreads(text, state.entries)
  };
  state.entries.unshift(entry);
  save();
  render();
  flash(PERSONAS[personaId].color);
  if (!modelReady()) return;

  setGenerating(true);
  try {
    const request = buildModelMessages(text, personaId, 'log');
    entry.reply = await window.COSMOS_AI.complete(request) || unavailableReply();
  } catch (error) {
    console.error(error);
    entry.reply = unavailableReply();
  } finally {
    setGenerating(false);
    save();
    render();
    flash(PERSONAS[personaId].color);
    $('#input').focus();
  }
}

function renderLog() {
  const col = $('#col');
  if (!state.entries.length) {
    col.innerHTML = hero('one entry in. one reflection back.');
    return;
  }
  let lastDay = '';
  col.innerHTML = state.entries.map((entry, index) => {
    const day = dayOf(entry.ts);
    const head = day !== lastDay ? `<div class="daymark">${day}</div>` : '';
    lastDay = day;
    const persona = PERSONAS[entry.persona] || PERSONAS.ripple;
    const thread = livingThreadForEntry(entry, state.entries);
    return `${head}<article class="entry" style="--c:${persona.color}">
      <header><time>${stamp(entry.ts)}</time><button class="x" data-i="${index}" aria-label="delete entry">✕</button></header>
      <p>${esc(entry.text)}</p>
      <div class="reply"><span class="rg">${persona.glyph}</span>${esc(entry.reply)}</div>
      ${renderThread(thread)}
    </article>`;
  }).join('');

  col.querySelectorAll('.x').forEach(button => {
    button.addEventListener('click', () => {
      state.entries.splice(+button.dataset.i, 1);
      save();
      render();
    });
  });
  col.querySelectorAll('.threadcard').forEach(card => {
    card.addEventListener('toggle', () => {
      const label = card.querySelector('.threadopen');
      if (label) label.textContent = card.open ? 'close' : 'open';
    });
  });
  $('#scroll').scrollTop = 0;
}

function hero(subtitle) {
  return `<div class="hero">
    <div class="mark">🟦🌌🟨</div>
    <h1>COSM.OS</h1>
    <p>${subtitle}</p>
    <p class="tip">chat keeps three raw exchanges. log is one-shot. commands run only when you type remember, summary, or plan.</p>
  </div>`;
}

function render() {
  $('#input').placeholder = generating
    ? 'local model is thinking…'
    : state.mode === 'chat' ? 'say it plain…' : 'what’s flowing through you now?';
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('on', tab.dataset.mode === state.mode);
  });
  paintRail();
  renderSidebar();
  state.mode === 'chat' ? renderChat() : renderLog();
}

function flash(color) {
  const bar = $('#bar');
  bar.style.setProperty('--c', color);
  bar.classList.add('lit');
  setTimeout(() => bar.classList.remove('lit'), 1400);
}

function submit() {
  if (generating) return;
  const input = $('#input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  input.style.height = 'auto';
  const command = parseCommand(text);
  if (command) return runCommand(text, command);
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
        const chat = normalizeChat({ title: chatTitle(data.messages), messages: data.messages });
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
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (generating) return;
    state.mode = tab.dataset.mode;
    save();
    render();
  });
});
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
