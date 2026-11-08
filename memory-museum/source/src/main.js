import './ui/style.css';
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { Archive, identity, settings, storeSettings } from './core/save.js';
import { codeText, dailyCode, glyphIndices, GLYPH_NAMES, makeDay, museumDate, parseCode } from './core/seed.js';
import { PERSONAS, TYPE_LABELS, WINGS } from './personas/personas.js';
import { Controller, SPAWN } from './movement/controller.js';
import { Museum } from './museum/world.js';
import { BASEMENT_SPAWN } from './museum/basement.js';
import { GARDEN_LEVEL, SEAT } from './museum/garden.js';
import { Diorama } from './museum/diorama.js';
import { AudioMuseum } from './audio/ambient.js';
import { fromForm, normalizedMemory, readJournal, scheduleEntries } from './memories/import.js';
import { updateExhibit } from './memories/exhibit.js';
import { Panel, button, escapeHTML as esc } from './ui/panel.js';
import { controlsBody, pauseBody, seedBody } from './ui/menus.js';
import { archiveRows, exhibitBody, journalBody, perspectiveBody, setupJournal } from './ui/journal.js';

const $ = id => document.getElementById(id);
const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const readShared = () => location.hash.startsWith('#seed=') ? parseCode(location.hash) : null;
const seedAsset = path => new URL(path, document.baseURI).href;

class Game {
  constructor() {
    this.canvas = $('world');
    this.config = settings();
    if (motionPreference.matches) this.config.reduced = true;
    this.persona = PERSONAS[this.config.activePersona] || WINGS[0];
    this.archiveId = identity();
    this.archive = new Archive();
    this.panel = new Panel($('panel'));
    this.audio = new AudioMuseum(this.config);
    this.input = new Input(this.canvas, $('touch'));
    this.mode = 'entrance';
    this.activeView = '';
    this.entered = false;
    this.previousFrame = performance.now();
    this.worldTime = 0;
    this.nextCheck = 0;
    this.sharedCode = readShared();
    this.lastZone = 'rotunda';
    this.mirrorCooldown = 0;
    this.viewToken = 0;
    this.boot();
  }

  async boot() {
    this.bind();
    try {
      this.engine = new Engine(this.canvas, this.config);
      this.player = new Controller(this.engine.camera);
      this.museum = new Museum(this.engine.scene, this.archive);
      await this.archive.load();
      this.refreshWorld();
      this.applyPreferences();
      $('enter').disabled = false;
      requestAnimationFrame(this.frame);
      if (import.meta.env.PROD && 'serviceWorker' in navigator) {
        navigator.serviceWorker.register(seedAsset('sw.js'), { updateViaCache: 'none' }).catch(() => {});
      }
    } catch (error) {
      console.error(error);
      $('entry-error').textContent = 'The 3D renderer could not start. Open this game in a browser with WebGL 2 enabled.';
      $('entry-error').hidden = false;
    }
  }

  bind() {
    $('enter').addEventListener('click', () => this.enter(true));
    $('entry-guide').addEventListener('click', () => this.guide(true));
    $('close-radial').addEventListener('click', () => this.walk());
    $('exit-mode').addEventListener('click', () => this.endMode());
    $('radial-options').innerHTML = WINGS.map((wing, index) => {
      const angle = index * Math.PI / 4;
      const x = 50 + 41 * Math.sin(angle), y = 50 - 41 * Math.cos(angle);
      return `<button type="button" class="radial-choice" data-index="${index}" aria-label="${wing.name} · ${wing.wing}" style="--x:${x}%;--y:${y}%;--accent:${wing.color}"><span>${wing.glyph}</span><small>${wing.name}</small></button>`;
    }).join('');
    $('radial-options').addEventListener('click', event => {
      const choice = event.target.closest('[data-index]');
      if (choice) this.selectPersona(Number(choice.dataset.index));
    });
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      if (this.locked && !locked && this.mode === 'walk') this.pause();
      this.locked = locked;
    });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.nextCheck = 0;
    });
    addEventListener('hashchange', () => {
      const value = readShared();
      if (value !== this.sharedCode && this.museum) this.visitLayout(value);
    });
    this.panel.dialog.addEventListener('input', event => {
      if (this.activeView !== 'pause') return;
      const { name, value, checked, type } = event.target;
      if (!Object.hasOwn(this.config, name)) return;
      this.config[name] = type === 'checkbox' ? checked : type === 'range' ? Number(value) : value;
      this.applyPreferences();
    });
    this.canvas.addEventListener('pointerdown', () => {
      if (this.mode === 'walk' || this.mode === 'scene') this.audio.unlock();
    });
  }

  applyPreferences() {
    document.body.classList.toggle('reduced', this.config.reduced);
    document.body.style.setProperty('--tint', this.persona.color);
    this.audio.volume();
    this.engine?.resize();
    storeSettings(this.config);
  }

  refreshWorld(relocate = false) {
    const date = museumDate();
    const memories = this.archive.memories;
    const stored = this.archive.world.days.find(item => item.date === date);
    const count = memories.filter(memory => !memory.sealed && (!memory.availableOn || memory.availableOn <= date)).length;
    const code = this.sharedCode ?? stored?.code ?? dailyCode(date, this.archiveId, count);
    this.day = makeDay({ date, memories, code, demonVisits: this.archive.world.demonVisits });
    this.museum.build(this.day);
    if (relocate) {
      this.player.place(SPAWN, 0);
      this.lastZone = 'rotunda';
    }
    if (this.sharedCode === null) {
      const record = {
        date, code, seed: this.day.glyphs.join(''),
        migrations: [...this.day.migrations], new_exhibits: this.day.newEntries.map(memory => memory.id),
        hidden_rooms: this.day.secretWing ? [this.day.secretWing] : [], cat_in_garden: this.day.cat,
      };
      this.archive.updateWorld(world => ({ ...world, days: [...world.days.filter(item => item.date !== date), record].slice(-45) }))
        .catch(() => {});
    }
    $('entrance-code').textContent = codeText(code);
    $('entrance-glyphs').textContent = this.day.glyphs.join(' ');
    $('entrance-glyphs').setAttribute('aria-label', glyphIndices(code).map(index => GLYPH_NAMES[index]).join(', '));
    $('entry-date').textContent = dateFormat.format(new Date(date + 'T12:00:00')).toUpperCase() + ' / 04:44';
    this.measureArchive();
  }

  measureArchive() {
    const memories = this.archive.memories.filter(memory => !memory.sealed);
    this.mood = memories.filter(memory => ['integrated', 'myth'].includes(memory.integration_status)).length / Math.max(1, memories.length);
    this.emotion = memories.filter(memory => !memory.demo).sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.emotion_tags[0] || 'peace';
  }

  enter(capture) {
    if (!this.day) return;
    this.entered = true;
    $('entrance').hidden = true;
    document.body.classList.add('entered');
    this.audio.unlock();
    this.audio.cue('arrive');
    this.player.place(SPAWN, 0);
    this.walk(capture);
  }

  changeMode(mode) {
    this.mode = mode;
    this.input.playing = mode === 'walk' || mode === 'scene';
    if (mode === 'panel' || mode === 'entrance' || mode === 'bench') {
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    }
    $('radial').hidden = mode !== 'radial';
    $('mode-banner').hidden = !['scene', 'bench'].includes(mode);
    if (mode !== 'walk') $('focus').hidden = true;
  }

  walk(capture = false) {
    this.clearMedia();
    this.panel.hide();
    this.activeView = '';
    this.changeMode('walk');
    if (capture && this.input.device !== 'controller') this.input.lock();
  }

  entrance() {
    this.clearMedia();
    this.panel.hide();
    this.entered = false;
    this.audio.silence();
    this.changeMode('entrance');
    document.body.classList.remove('entered');
    $('entrance').hidden = false;
    $('enter').focus({ preventScroll: true });
  }

  toast(message) {
    clearTimeout(this.toastTimeout);
    const node = $('toast');
    node.textContent = message;
    node.hidden = false;
    this.toastTimeout = setTimeout(() => { node.hidden = true; }, 2800);
  }

  transition() {
    clearTimeout(this.shiftTimeout);
    $('transition').classList.add('shifting');
    this.shiftTimeout = setTimeout(() => $('transition').classList.remove('shifting'), 140);
  }

  show(name, title, kicker, body, { activate, submit, close } = {}) {
    this.clearMedia();
    this.changeMode('panel');
    this.activeView = name;
    this.panel.dialog.dataset.view = name;
    this.panel.show({ title, kicker, body, activate, submit, close: close || (() => this.walk(true)) });
  }

  guide(initial) {
    this.show('guide', 'How to move', 'Visitor orientation', controlsBody(initial),
      { close: () => initial ? this.entrance() : this.pause() });
  }

  pause() {
    this.show('pause', 'Pause', 'Visitor settings', pauseBody(this.persona, this.config, this.sharedCode !== null), {
      activate: action => {
        if (action === 'controls') this.guide(false);
        if (action === 'rotunda') {
          this.transition();
          this.player.place(SPAWN, 0);
          this.walk(true);
        }
        if (action === 'entrance') this.entrance();
        if (action === 'seed') this.seedPanel(() => this.pause());
      },
    });
  }

  seedPanel(close) {
    this.show('seed', 'The Daily Seed', 'The Rotunda · Central pedestal', seedBody(this.day, this.sharedCode !== null), {
      close,
      activate: action => {
        if (action === 'today') this.visitLayout(null);
        if (action === 'share') this.shareSeed();
      },
      submit: (_form, data) => {
        const code = parseCode(String(data.get('code')));
        if (code === null) this.panel.error('Enter four museum glyphs or a four-character hexadecimal code.');
        else this.visitLayout(code);
      },
    });
  }

  async shareSeed() {
    const url = new URL(location.href);
    url.hash = `seed=${codeText(this.day.code)}`;
    try {
      await navigator.clipboard.writeText(url.href);
      this.panel.error('');
      this.panel.find('.form-error').textContent = 'Seed link copied.';
    } catch {
      const input = this.panel.find('input[name=code]');
      input.value = codeText(this.day.code);
      input.select();
      this.panel.error('Copy the selected seed code to share this layout.');
    }
  }

  visitLayout(code) {
    this.sharedCode = code;
    const url = new URL(location.href);
    url.hash = code === null ? '' : `seed=${codeText(code)}`;
    history.replaceState(null, '', url);
    this.transition();
    this.refreshWorld(true);
    this.audio.cue('shift');
    if (this.entered) this.walk(true);
    else this.entrance();
  }

  journal(tab = 'archive') {
    const memories = this.archive.memories.filter(memory => !memory.sealed)
      .sort((a, b) => Number(a.demo) - Number(b.demo) || b.timestamp.localeCompare(a.timestamp));
    this.show('journal', 'The Notebook', 'Curator’s desk', journalBody(tab, memories, this.persona.id, this.day.date, this.archive.canPersist), {
      activate: (action, id) => {
        if (action === 'tab') this.journal(id);
        if (action === 'memory') this.openMemory(id, memories, () => this.journal('archive'));
      },
      submit: async (form, data) => {
        const control = form.querySelector('button[type=submit]');
        if (control.disabled) return;
        const token = this.viewToken;
        control.disabled = true;
        this.panel.error('');
        try {
          const records = form.dataset.form === 'import'
            ? await readJournal(data.get('journal'), String(data.get('persona'))) : [fromForm(data)];
          await this.saveNew(records);
          if (token !== this.viewToken) return;
          const count = records.length;
          this.journal('archive');
          this.toast(count === 1 ? 'Exhibit saved.' : `${count} exhibits saved.`);
        } catch (error) {
          if (token === this.viewToken) this.panel.error(error.message || 'The archive could not be saved.');
        } finally { control.disabled = false; }
      },
    });
    setupJournal(this.panel);
  }

  async saveNew(records) {
    scheduleEntries(records, this.archive.memories);
    await this.archive.saveMany(records);
    this.refreshWorld();
  }

  catalogue(wing) {
    const entries = wing === 'sealed' ? this.archive.memories.filter(memory => memory.sealed) : this.day.wingEntries[wing];
    const name = wing === 'sealed' ? 'The Basement' : PERSONAS[wing].wing + ' Wing';
    this.show('catalogue', 'Exhibit Catalogue', name, `<div class="archive-list">${archiveRows(entries, this.day.date, wing === 'sealed')}</div>`, {
      activate: (action, id) => { if (action === 'memory') this.openMemory(id, entries, () => this.catalogue(wing)); },
    });
  }

  openMemory(id, list, close, autoPlay = false) {
    if (!this.archive.entries.has(id)) return;
    this.currentId = id;
    this.memoryList = list.map(memory => memory.id);
    this.closeMemory = close;
    this.holdStarted = null;
    this.holdPointer = false;
    this.renderMemory(autoPlay);
    this.archive.update(id, memory => memory && ({ ...memory, visit_count: memory.visit_count + 1, last_visited: new Date().toISOString() }))
      .catch(() => {});
  }

  renderMemory(autoPlay = false) {
    const memory = this.archive.entries.get(this.currentId);
    if (!memory) return this.closeMemory();
    this.show('exhibit', memory.title, `${PERSONAS[memory.persona].wing} archive · ${TYPE_LABELS[memory.type]}`,
      exhibitBody(memory, this.persona, this.memoryList.length > 1), {
        close: () => this.closeMemory(),
        activate: (action, _, control) => this.exhibitAction(action, memory, control),
      });
    const hold = this.panel.find('.hold');
    if (hold) {
      hold.addEventListener('pointerdown', event => {
        hold.setPointerCapture(event.pointerId);
        this.holdPointer = true;
        this.holdStarted ??= performance.now();
      });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) hold.addEventListener(name, () => {
        if (name === 'pointerup' && this.holdPointer && this.holdStarted !== null && performance.now() - this.holdStarted >= 3000) this.integrate();
        this.holdPointer = false;
      });
      hold.addEventListener('keydown', event => {
        if (event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          this.holdPointer = true;
        }
      });
      hold.addEventListener('keyup', () => { this.holdPointer = false; });
      hold.addEventListener('blur', () => { this.holdPointer = false; });
    }
    this.attachMedia(memory, autoPlay);
    if (autoPlay && !memory.hasMedia && !memory.asset && ['audio', 'song'].includes(memory.type)) {
      this.toggleTrack(memory, this.panel.find('[data-do=track]'));
    }
  }

  exhibitAction(action, memory, control) {
    if (action === 'note') this.note(memory);
    if (action === 'perspective') this.perspective(memory);
    if (action === 'scene') this.startScene(memory);
    if (action === 'remove') this.confirmRemove(memory);
    if (action === 'track') this.toggleTrack(memory, control);
    if (action === 'scratch') this.audio.scratch(1);
    if (action === 'zoom') {
      const box = control.closest('.media-box');
      box.classList.toggle('zoom');
      control.textContent = box.classList.contains('zoom') ? 'Fit image' : 'Zoom image';
    }
    if (action === 'previous' || action === 'next') this.pageMemory(action === 'previous' ? -1 : 1);
  }

  pageMemory(direction) {
    const memory = this.archive.entries.get(this.currentId);
    if (memory?.type === 'song' && (this.audio.currentTrack || this.mediaElement && !this.mediaElement.paused)) {
      this.audio.scratch(direction);
      if (this.mediaElement) this.mediaElement.currentTime = Math.max(0, Math.min(this.mediaElement.duration || Infinity, this.mediaElement.currentTime + direction * 0.32));
      return;
    }
    const list = this.memoryList.filter(id => this.archive.entries.has(id));
    if (list.length < 2) return;
    const next = list[(list.indexOf(this.currentId) + direction + list.length) % list.length];
    this.openMemory(next, list.map(id => this.archive.entries.get(id)), this.closeMemory);
  }

  clearMedia() {
    this.viewToken++;
    this.holdPointer = false;
    this.holdStarted = null;
    this.audio.stopTrack();
    if (this.mediaElement) this.mediaElement.pause();
    this.mediaElement = null;
    if (this.mediaURL) URL.revokeObjectURL(this.mediaURL);
    this.mediaURL = null;
  }

  toggleTrack(memory, control) {
    this.audio.unlock();
    const started = this.audio.track(memory, this.focusTarget?.point.x > this.player.position.x ? 0.22 : -0.22);
    if (control) control.textContent = started ? 'Stop recording' : 'Play recording';
  }

  async attachMedia(memory, autoPlay) {
    const box = this.panel.find('[data-media]');
    if (!box) return;
    const token = this.viewToken;
    try {
      const blob = memory.hasMedia ? await this.archive.getMedia(memory.id) : null;
      if (token !== this.viewToken) return;
      const url = memory.asset ? seedAsset('media/' + memory.asset) : blob && URL.createObjectURL(blob);
      if (blob) this.mediaURL = url;
      if (!url) throw new Error();
      box.textContent = '';
      if (memory.type === 'image') {
        const image = document.createElement('img');
        image.src = url;
        image.alt = memory.title;
        image.onerror = () => { box.textContent = 'This image could not be displayed.'; };
        box.append(image);
        box.insertAdjacentHTML('beforeend', button('Zoom image', 'zoom'));
      } else {
        const element = document.createElement(memory.type === 'video' ? 'video' : 'audio');
        element.controls = true;
        element.playsInline = true;
        element.preload = 'metadata';
        element.volume = this.config.muted ? 0 : this.config.volume;
        element.muted = this.config.muted;
        element.src = url;
        element.onerror = () => { box.textContent = 'This media format could not be played in this browser.'; };
        box.append(element);
        this.mediaElement = element;
        if (autoPlay) element.play().catch(() => {});
      }
    } catch { if (token === this.viewToken) box.textContent = 'This media file is unavailable.'; }
  }

  async integrate() {
    const id = this.currentId;
    const token = this.viewToken;
    const control = this.panel.find('.hold');
    if (!control || control.disabled) return;
    control.disabled = true;
    try {
      const memory = await this.archive.update(id, current => current && ({ ...current, integration_status: 'integrated' }));
      if (!memory) return;
      updateExhibit(this.museum, memory);
      this.measureArchive();
      this.audio.cue('integrate');
      if (token === this.viewToken) {
        this.renderMemory();
        this.toast('Exhibit integrated.');
      }
    } catch {
      control.disabled = false;
      this.holdStarted = null;
      this.toast('The exhibit could not be saved.');
    }
  }

  note(memory) {
    this.show('note', 'Curator’s note', memory.title, `<form data-form="note">
      <label class="stack-label">Note <textarea name="note" maxlength="2000" required placeholder="What do you want to remember about this?"></textarea></label>
      <p class="form-error" role="alert"></p><button type="submit" class="button primary">Save note</button></form>`, {
      close: () => this.renderMemory(),
      submit: async (form, data) => {
        const control = form.querySelector('button[type=submit]');
        const note = String(data.get('note')).trim();
        if (!note) return this.panel.error('Write a note before saving.');
        if (control.disabled) return;
        control.disabled = true;
        const token = this.viewToken;
        try {
          await this.archive.update(memory.id, current => current && ({ ...current, notes: [...current.notes, { text: note, created_at: new Date().toISOString() }] }));
          if (token === this.viewToken) this.renderMemory();
        } catch { if (token === this.viewToken) this.panel.error('The note could not be saved.'); }
        finally { control.disabled = false; }
      },
    });
  }

  perspective(memory) {
    let lift = 0, replay = 0;
    const lines = (memory.content || memory.title).match(/[^\n.!?]+[.!?]*|\n+/g)?.map(line => line.trim()).filter(Boolean) || [memory.title];
    this.show('perspective', this.persona.voice, `${this.persona.name} · ${memory.title}`, perspectiveBody(memory, this.persona, this.archive.memories), {
      close: () => this.renderMemory(),
      activate: (action, id, control) => {
        if (action === 'note') this.note(memory);
        if (action === 'memory') {
          const destination = this.archive.entries.get(id);
          if (destination) this.openMemory(id, [destination, memory], this.closeMemory);
        }
        if (action === 'lift') {
          lift++;
          this.audio.cue(lift === 3 ? 'integrate' : 'select');
          this.panel.find('#lift-count').textContent = lift === 3 ? '3 / 3 · Set it down.' : `${lift} / 3`;
          control.disabled = lift === 3;
        }
        if (action === 'replay-next' || action === 'replay-prev') {
          replay = (replay + (action === 'replay-next' ? 1 : -1) + lines.length) % lines.length;
          this.panel.find('#replay-line').textContent = lines[replay];
          this.audio.cue('select');
        }
      },
      submit: async (form, data) => {
        const control = form.querySelector('button[type=submit]');
        if (control.disabled) return;
        control.disabled = true;
        const token = this.viewToken;
        try {
          const myth = form.dataset.form === 'myth';
          const line = String(data.get('line') || '').trim();
          const pair = this.archive.entries.get(String(data.get('second')));
          if (!myth && !pair) throw new Error('Choose a second exhibit.');
          const title = myth ? `Story of ${memory.title}` : `${memory.title} × ${pair.title}`;
          const body = myth ? [line, memory.content || memory.title]
            : [line, memory.content || memory.title, pair.content || pair.title];
          const entry = normalizedMemory({ title, content: body.filter(Boolean).join('\n\n'),
            persona: myth ? 'hermes' : 'flux', intensity: memory.intensity, emotion_tags: memory.emotion_tags,
            integration_status: myth ? 'myth' : 'processing' });
          await this.saveNew([{ memory: entry }]);
          if (token === this.viewToken) this.openMemory(entry.id, [entry, memory], this.closeMemory);
        } catch (error) { if (token === this.viewToken) this.panel.error(error.message); }
        finally { control.disabled = false; }
      },
    });
    const line = this.panel.find('#replay-line');
    if (line) line.textContent = lines[0];
  }

  confirmRemove(memory) {
    this.show('remove', 'Remove this exhibit?', memory.title,
      `<p class="panel-copy">This deletes the entry, its media, and its notes from this browser.</p><div class="actions">${button('Remove exhibit', 'delete', { kind: 'danger' })}${button('Keep it', 'close')}</div>`, {
        close: () => this.renderMemory(),
        activate: async (action, _, control) => {
          if (action !== 'delete' || control.disabled) return;
          control.disabled = true;
          const token = this.viewToken;
          try {
            await this.archive.remove(memory.id);
            this.refreshWorld();
            if (token === this.viewToken) this.closeMemory();
            this.toast('Exhibit removed.');
          } catch { this.toast('The exhibit could not be removed.'); }
          finally { control.disabled = false; }
        },
      });
  }

  radial() {
    this.radialHold = this.input.device !== 'touch' && this.input.down('persona');
    this.radialIndex = WINGS.indexOf(this.persona);
    this.changeMode('radial');
    this.highlightPersona(this.radialIndex);
    $('radial-hint').textContent = this.radialHold
      ? this.input.device === 'controller' ? 'Right stick to select. Release RB to confirm.' : 'Arrows to select. Release Q to confirm.'
      : 'Choose a persona.';
    if (!this.radialHold) $('radial-options').querySelector('.active').focus({ preventScroll: true });
  }

  highlightPersona(index) {
    this.radialIndex = (index + WINGS.length) % WINGS.length;
    const wing = WINGS[this.radialIndex];
    $('radial-title').textContent = wing.name;
    $('radial-role').textContent = wing.wing;
    for (const option of $('radial-options').children) {
      const active = Number(option.dataset.index) === this.radialIndex;
      option.classList.toggle('active', active);
      option.setAttribute('aria-pressed', String(active));
    }
  }

  selectPersona(index) {
    this.persona = WINGS[index];
    this.config.activePersona = this.persona.id;
    this.applyPreferences();
    this.audio.cue('select');
    this.walk();
  }

  handleRadial() {
    if (this.input.pressed('back')) return this.walk();
    const [x, y] = this.input.right;
    if (Math.hypot(x, y) > 0.46) this.highlightPersona(Math.round(Math.atan2(x, -y) / (Math.PI / 4)));
    if (this.input.pressed('ArrowLeft') || this.input.pressed('previous')) this.highlightPersona(this.radialIndex - 1);
    if (this.input.pressed('ArrowRight') || this.input.pressed('next')) this.highlightPersona(this.radialIndex + 1);
    for (let index = 0; index < 8; index++) if (this.input.pressed(`Digit${index + 1}`)) this.highlightPersona(index);
    if (this.input.pressed('interact') || this.radialHold && !this.input.down('persona')) this.selectPersona(this.radialIndex);
  }

  startScene(memory) {
    this.clearMedia();
    this.panel.hide();
    this.diorama = new Diorama(this.engine.scene, memory);
    this.museum.root.visible = false;
    this.changeMode('scene');
    $('mode-kicker').textContent = 'Diorama · Memory mode';
    $('mode-title').textContent = memory.title;
    $('exit-mode').textContent = 'Back to exhibit';
    this.audio.cue('select');
  }

  bench() {
    this.player.place(SEAT, Math.PI, 0.03);
    this.engine.camera.position.y = GARDEN_LEVEL + 1.23;
    this.changeMode('bench');
    $('mode-kicker').textContent = 'The Garden';
    $('mode-title').textContent = 'The Present Moment';
    $('exit-mode').textContent = 'Stand up';
  }

  endMode() {
    if (this.mode === 'scene') {
      this.diorama.close();
      this.diorama = null;
      this.museum.root.visible = true;
      this.player.place(this.player.position, this.player.yaw, this.player.pitch);
      this.renderMemory();
    } else if (this.mode === 'bench') {
      this.player.place({ x: 0, y: GARDEN_LEVEL, z: -16.25 }, Math.PI);
      this.walk(true);
    }
  }

  crossMirror(index) {
    const mirror = this.museum.mirrors[index];
    if (!mirror) return;
    this.mirrorCooldown = performance.now() + 1800;
    this.player.place({ x: mirror.x, y: 0, z: mirror.z - 1.13 }, 0);
    this.audio.cue('secret');
    this.transition();
  }

  interact(target) {
    if (!target) return;
    if (target.kind === 'seed') this.seedPanel();
    if (target.kind === 'memory') {
      const memory = this.archive.entries.get(target.value);
      if (!memory) return;
      const list = memory.sealed ? this.archive.memories.filter(entry => entry.sealed)
        : this.day.wingEntries[this.lastZone] || [memory];
      this.openMemory(memory.id, list, () => this.walk(true), ['audio', 'song', 'video'].includes(memory.type));
    }
    if (target.kind === 'bench') this.bench();
    if (target.kind === 'cat') {
      this.audio.cue('cat');
      this.toast('The cat stays.');
    }
    if (target.kind === 'secret') {
      this.audio.cue('secret');
      this.show('secret', 'The Unmarked Room', `${PERSONAS[target.value].wing} Wing · Found space`,
        '<p class="memory-body">Some rooms are built to hold an exhibit. This one was left empty on purpose.</p>');
    }
    if (target.kind === 'mirror') this.crossMirror(target.value);
    if (target.kind === 'catalogue') this.catalogue(target.value);
    if (target.kind === 'basement') {
      this.show('basement', 'The sealed archive', 'Shadow Wing · Below the gallery',
        `<p class="panel-copy">This room holds memories you deliberately filed downstairs. You can leave whenever you like.</p>
        <div class="actions">${button('Go downstairs', 'enter', { kind: 'primary' })}${button('Stay here', 'close')}</div>`,
        { activate: action => {
          if (action !== 'enter') return;
          this.player.place(BASEMENT_SPAWN, 0);
          this.transition();
          this.audio.cue('secret');
          this.walk(true);
        } });
    }
    if (target.kind === 'basementExit') {
      this.player.place(this.museum.basementReturn || SPAWN, 0);
      this.transition();
    }
  }

  handlePanel(now) {
    const input = this.input;
    const active = this.activeView;
    if (input.pressed('back')) {
      if (active === 'exhibit' && this.mediaElement?.tagName === 'VIDEO' && !this.mediaElement.paused) this.mediaElement.pause();
      else this.panel.close?.();
      return;
    }
    if (input.pressed('flashlight')) this.panel.moveFocus(-1);
    if (input.pressed('sit')) this.panel.moveFocus(1);
    if (active === 'exhibit') {
      if (input.pressed('journal')) return this.note(this.archive.entries.get(this.currentId));
      if (input.pressed('next') || input.pressed('previous')) return this.pageMemory(input.pressed('next') ? 1 : -1);
      const hold = this.panel.find('.hold');
      const focused = document.activeElement;
      const pad = input.device === 'controller';
      const focusedAction = pad && focused?.matches('button:not(.hold):not(.close-panel)');
      if (focusedAction && input.pressed('interact')) return focused.click();
      if (hold && !hold.disabled) {
        const down = this.holdPointer || input.down('interact') && !focusedAction && !focused?.matches('audio, video, input, textarea');
        if (down && !document.hidden) this.holdStarted ??= now;
        else this.holdStarted = null;
        const elapsed = this.holdStarted === null ? 0 : now - this.holdStarted;
        hold.style.setProperty('--hold', String(Math.min(1, elapsed / 3000)));
        if (elapsed >= 3000) this.integrate();
      } else if (pad && input.pressed('interact')) focused?.click();
      const play = this.panel.find('[data-do=track]');
      if (play?.textContent === 'Stop recording' && !this.audio.currentTrack) play.textContent = 'Play recording';
    } else if (input.device === 'controller' && input.pressed('interact')) {
      document.activeElement?.click();
    }
  }

  updateWalk(dt) {
    const input = this.input;
    if (input.pressed('back')) return this.pause();
    if (input.pressed('persona')) return this.radial();
    if (input.pressed('journal')) return this.journal();
    if (input.pressed('flashlight')) this.torch = !this.torch;
    const steps = Math.max(1, Math.ceil(dt / 0.034));
    const stepInput = steps === 1 ? input : { move: input.move, right: input.right, frameLook: [0, 0],
      pressed: () => false, down: action => input.down(action) };
    for (let step = 0; step < steps; step++) {
      this.player.update(dt / steps, step ? stepInput : input, this.museum.collision, this.persona, this.config,
        speed => this.audio.foot(speed, this.lastZone));
    }
    const zone = this.museum.zone(this.player.position);
    if (zone !== this.lastZone) {
      this.lastZone = zone;
      if (zone === 'rotunda') this.audio.cue('arrive');
      if (zone === 'demon' && this.sharedCode === null) {
        this.archive.updateWorld(world => ({ ...world, demonVisits: world.demonVisits + 1 })).then(world => {
          if (world.demonVisits >= 7 && !this.day.basement) this.refreshWorld();
        }).catch(() => {});
      }
    }
    const target = this.focusTarget = this.museum.nearby(this.engine.camera);
    $('focus').hidden = !target;
    if (target) {
      const key = input.device === 'keyboard' ? 'E' : 'A';
      const label = `${key} · ${target.title}`;
      if ($('focus-label').textContent !== label) $('focus-label').textContent = label;
    }
    if (input.pressed('sit') && zone === 'garden' && this.player.position.distanceTo(SEAT) < 4.5) return this.bench();
    if (input.pressed('interact')) return this.interact(target);
    if (zone === 'demon' && performance.now() > this.mirrorCooldown) {
      const crossing = this.museum.mirrors.findIndex(point =>
        Math.hypot(point.x - this.player.position.x, point.z - this.player.position.z) < 0.31);
      if (crossing >= 0) this.crossMirror(1 - crossing);
    }
  }

  frame = now => {
    const elapsed = Math.max(0, Math.min(0.20, (now - this.previousFrame) / 1000));
    const dt = Math.min(0.042, elapsed);
    this.previousFrame = now;
    this.input.poll();
    if (this.mode === 'walk' || this.mode === 'entrance') {
      if (now >= this.nextCheck) {
        this.nextCheck = now + 7000;
        if (this.sharedCode === null && museumDate() !== this.day.date) {
          this.transition();
          this.refreshWorld(true);
          this.audio.cue('shift');
          if (this.entered) this.toast('The halls shift.');
        }
      }
    }

    if (this.mode === 'entrance') {
      this.engine.preview(this.worldTime);
      if (this.input.pressed('interact')) this.enter(false);
    } else if (this.mode === 'walk') this.updateWalk(elapsed);
    else if (this.mode === 'panel') {
      if (!this.entered) this.engine.preview(this.worldTime);
      this.handlePanel(now);
    } else if (this.mode === 'radial') this.handleRadial();
    else if (this.mode === 'scene') {
      this.diorama.view(this.engine.camera, this.input, dt, this.config.reduced);
      if (this.input.pressed('back') || this.input.pressed('interact')) this.endMode();
    } else if (this.mode === 'bench' && ['back', 'sit', 'interact'].some(action => this.input.pressed(action))) {
      this.endMode();
    }
    const visibleTouch = this.config.touch === 'always' || this.config.touch === 'auto' && this.input.device === 'touch';
    $('touch').hidden = this.mode !== 'walk' || !visibleTouch;
    const zone = this.mode === 'scene' ? 'diorama' : this.entered ? this.lastZone : 'rotunda';
    this.worldTime += dt * (this.mode === 'radial' ? 0.2 : 1);
    if (this.entered) this.audio.update(zone, this.persona, this.mode === 'panel', this.mood, this.emotion);
    if (!this.engine.software || this.mode !== 'panel' || this.lastRenderMode !== this.mode) {
      this.engine.render(this.worldTime, dt, this.museum, this.persona, zone, this.torch && this.entered, this.day.light);
    }
    this.lastRenderMode = this.mode;
    requestAnimationFrame(this.frame);
  };
}

new Game();
