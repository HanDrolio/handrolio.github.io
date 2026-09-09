import { ORDER, getPersona } from './registry.js';
import { livingThreadForEntry } from './threads.js';

const esc = value => {
  const node = document.createElement('div');
  node.textContent = String(value ?? '');
  return node.innerHTML;
};

const stamp = ts => new Date(ts).toLocaleString([], {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
});

const dayOf = ts => new Date(ts).toLocaleDateString([], {
  weekday: 'long', month: 'long', day: 'numeric'
});

function compactModelName(id = '') {
  return id
    .replace(/-q\df\d+_\d+-MLC.*$/i, '')
    .replace(/-Instruct/i, '')
    .replace(/-/g, ' ')
    .trim();
}

function threadMarkup(thread) {
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

function hero(subtitle) {
  return `<div class="hero">
    <div class="mark">🟦🌌🟨</div>
    <h1>COSM.OS</h1>
    <p>${subtitle}</p>
    <p class="tip">call a voice directly with <code>@orion</code>, pin one above, or optionally load the private local model.</p>
  </div>`;
}

export function createUI(handlers) {
  const refs = {
    rail: document.querySelector('#rail'),
    lockNote: document.querySelector('#lockNote'),
    modelBar: document.querySelector('#modelBar'),
    modelStatus: document.querySelector('#modelStatus'),
    modelBtn: document.querySelector('#modelBtn'),
    col: document.querySelector('#col'),
    scroll: document.querySelector('#scroll'),
    bar: document.querySelector('#bar'),
    input: document.querySelector('#input'),
    send: document.querySelector('#send'),
    exportBtn: document.querySelector('#export'),
    importBtn: document.querySelector('#importBtn'),
    importFile: document.querySelector('#importFile')
  };

  let generating = false;

  function buildRail() {
    refs.rail.innerHTML = ORDER.map(id => {
      const persona = getPersona(id);
      return `<button class="chip" data-id="${id}" style="--c:${persona.color}" title="${esc(persona.role)}">
        <span class="cg">${persona.glyph}</span><span class="cn">${esc(persona.name)}</span>
      </button>`;
    }).join('');
  }

  function wireEvents() {
    refs.rail.addEventListener('click', event => {
      const chip = event.target.closest('.chip');
      if (chip) handlers.onToggleLock?.(chip.dataset.id);
    });

    refs.input.addEventListener('input', event => {
      event.target.style.height = 'auto';
      event.target.style.height = Math.min(140, event.target.scrollHeight) + 'px';
    });

    refs.input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    });

    refs.send.addEventListener('click', submit);
    refs.modelBtn.addEventListener('click', () => handlers.onLoadModel?.());

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (!generating) handlers.onMode?.(tab.dataset.mode);
      });
    });

    refs.exportBtn.addEventListener('click', () => handlers.onExport?.());
    refs.importBtn.addEventListener('click', () => refs.importFile.click());
    refs.importFile.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (file) handlers.onImport?.(file);
      event.target.value = '';
    });

    refs.col.addEventListener('click', event => {
      const remove = event.target.closest('.x[data-entry-id]');
      if (remove) handlers.onDeleteEntry?.(remove.dataset.entryId);
    });

    refs.col.addEventListener('toggle', event => {
      if (!(event.target instanceof HTMLDetailsElement) || !event.target.classList.contains('threadcard')) return;
      const label = event.target.querySelector('.threadopen');
      if (label) label.textContent = event.target.open ? 'close' : 'open';
    }, true);
  }

  function submit() {
    if (generating) return;
    const text = refs.input.value.trim();
    if (!text) return;
    refs.input.value = '';
    refs.input.style.height = 'auto';
    handlers.onSubmit?.(text);
  }

  function renderRail(state) {
    refs.rail.querySelectorAll('.chip').forEach(chip => {
      chip.classList.toggle('on', chip.dataset.id === state.lock);
    });
    const persona = state.lock ? getPersona(state.lock) : null;
    refs.lockNote.textContent = persona ? `locked to ${persona.name} · tap again to release` : '';
    document.documentElement.style.setProperty('--live', persona ? persona.color : 'var(--violet)');
  }

  function renderChat(state) {
    if (!state.messages.length) {
      refs.col.innerHTML = hero('say it plain. it answers in a voice.');
      return;
    }

    refs.col.innerHTML = state.messages.map(message => {
      if (message.role === 'you') {
        return `<div class="msg you"><div class="bubble">${esc(message.text)}</div></div>`;
      }
      const persona = getPersona(message.persona);
      return `<div class="msg os${message.generating ? ' generating' : ''}" style="--c:${persona.color}">
        <div class="who"><span class="wg">${persona.glyph}</span>${esc(persona.name)}<em>${esc(persona.role)}</em></div>
        <div class="bubble">${esc(message.text)}</div>
      </div>`;
    }).join('');

    requestAnimationFrame(() => { refs.scroll.scrollTop = refs.scroll.scrollHeight; });
  }

  function renderLog(state) {
    if (!state.entries.length) {
      refs.col.innerHTML = hero('the archive starts when you do.');
      return;
    }

    let lastDay = '';
    refs.col.innerHTML = state.entries.map(entry => {
      const day = dayOf(entry.ts);
      const heading = day !== lastDay ? `<div class="daymark">${day}</div>` : '';
      lastDay = day;
      const persona = getPersona(entry.persona);
      const thread = livingThreadForEntry(entry, state.entries);

      return `${heading}<article class="entry" style="--c:${persona.color}">
        <header><time>${stamp(entry.ts)}</time><button class="x" data-entry-id="${esc(entry.id)}" aria-label="delete entry">✕</button></header>
        <p>${esc(entry.text)}</p>
        <div class="reply"><span class="rg">${persona.glyph}</span>${esc(entry.reply)}</div>
        ${threadMarkup(thread)}
      </article>`;
    }).join('');

    refs.scroll.scrollTop = 0;
  }

  function render(state) {
    refs.input.placeholder = generating
      ? 'local model is thinking…'
      : state.mode === 'chat' ? 'say it plain…' : "what's flowing through you now?";

    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.toggle('on', tab.dataset.mode === state.mode);
    });

    renderRail(state);
    state.mode === 'chat' ? renderChat(state) : renderLog(state);
  }

  function setGenerating(value) {
    generating = Boolean(value);
    refs.send.disabled = generating;
    refs.input.disabled = generating;
    refs.bar.classList.toggle('busy', generating);
  }

  function paintModelStatus(modelState) {
    refs.modelBar.dataset.phase = modelState.phase;
    refs.modelBtn.disabled = false;

    const modelName = compactModelName(modelState.modelId);

    if (modelState.phase === 'loading') {
      const percent = Math.max(0, Math.min(100, Math.round((modelState.progress || 0) * 100)));
      refs.modelStatus.textContent = `${percent}% · ${modelState.text || 'loading local model'}`;
      refs.modelBtn.textContent = 'loading…';
      refs.modelBtn.disabled = true;
    } else if (modelState.phase === 'ready') {
      refs.modelStatus.textContent = `local · ${modelName || 'ai ready'}`;
      refs.modelBtn.textContent = 'ai ready';
      refs.modelBtn.disabled = true;
    } else if (modelState.phase === 'cached') {
      refs.modelStatus.textContent = `cached · ${modelName || 'local model'} · tap restore`;
      refs.modelBtn.textContent = 'restore ai';
    } else if (modelState.phase === 'interrupted') {
      refs.modelStatus.textContent = 'previous load interrupted · mobile-safe retry available';
      refs.modelBtn.textContent = 'retry';
    } else if (modelState.phase === 'unsupported') {
      refs.modelStatus.textContent = 'WebGPU unavailable · deterministic mode active';
      refs.modelBtn.textContent = 'unsupported';
      refs.modelBtn.disabled = true;
    } else if (modelState.phase === 'error') {
      refs.modelStatus.textContent = 'local ai failed · deterministic mode active';
      refs.modelBtn.textContent = 'retry';
    } else {
      refs.modelStatus.textContent = 'deterministic mode · no local model active';
      refs.modelBtn.textContent = 'load local ai';
    }

    refs.modelBar.title = modelState.error || modelState.modelId || modelState.text || '';
  }

  function flash(color) {
    refs.bar.style.setProperty('--c', color);
    refs.bar.classList.add('lit');
    setTimeout(() => refs.bar.classList.remove('lit'), 1800);
  }

  buildRail();
  wireEvents();

  return { render, setGenerating, paintModelStatus, flash, refs };
}
