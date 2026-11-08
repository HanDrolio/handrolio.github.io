const KEYS = {
  KeyE: 'interact', Enter: 'interact', Space: 'jump', ShiftLeft: 'sprint', ShiftRight: 'sprint',
  ControlLeft: 'slide', ControlRight: 'slide', KeyC: 'crouch', KeyQ: 'persona', KeyJ: 'journal', KeyY: 'journal',
  KeyF: 'flashlight', KeyV: 'sit', BracketLeft: 'previous', BracketRight: 'next', Escape: 'back',
};
const BUTTONS = ['interact', 'back', 'crouch', 'journal', 'slide', 'persona', 'jump', 'sprint', null,
  'back', null, null, 'flashlight', 'sit', 'previous', 'next'];

function stick(x, y, dead = 0.15) {
  const length = Math.hypot(x, y);
  if (length < dead) return [0, 0];
  const strength = (Math.min(length, 1) - dead) / (1 - dead);
  return [x / length * strength, y / length * strength];
}

export class Input {
  constructor(canvas, touch) {
    this.canvas = canvas;
    this.touch = touch;
    this.keys = new Set();
    this.tapped = new Set();
    this.actions = new Set();
    this.held = new Set();
    this.prevPad = new Set();
    this.look = [0, 0];
    this.touchMove = [0, 0];
    this.touchButtons = new Map();
    this.playing = false;
    this.canTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    this.lastPadUse = -Infinity;

    addEventListener('keydown', event => {
      if (event.target.closest?.('input, textarea, select, [contenteditable]') && event.code !== 'Escape') return;
      if (event.metaKey || event.altKey) return;
      if (event.code === 'Enter' && event.target.closest?.('button, a') && !this.playing) return;
      if (event.code === 'Space' && event.target.closest?.('button, a') && !this.playing) return;
      this.keys.add(event.code);
      if (!event.repeat) this.tapped.add(KEYS[event.code] || event.code);
      if (this.playing && (KEYS[event.code] || event.code.startsWith('Arrow'))) event.preventDefault();
    });
    addEventListener('keyup', event => this.keys.delete(event.code));
    addEventListener('blur', () => {
      this.keys.clear();
      this.tapped.clear();
      this.touchButtons.clear();
      this.touchMove = [0, 0];
      this.touch.classList.remove('stick-active');
    });
    document.addEventListener('mousemove', event => {
      if (this.playing && document.pointerLockElement === this.canvas) {
        this.look[0] += event.movementX;
        this.look[1] += event.movementY;
      }
    });
    canvas.addEventListener('pointerdown', event => {
      if (!this.playing || document.pointerLockElement === canvas || event.button > 0) return;
      if (event.pointerType === 'mouse' && this.mouseLockAvailable && !this.preferDrag) {
        this.lock();
        return;
      }
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', event => {
      if (!this.playing || this.drag?.id !== event.pointerId) return;
      this.look[0] += event.clientX - this.drag.x;
      this.look[1] += event.clientY - this.drag.y;
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => {
      if (this.drag?.id === event.pointerId) this.drag = null;
    });
    this.mouseLockAvailable = typeof canvas.requestPointerLock === 'function';
    document.addEventListener('pointerlockerror', () => { this.preferDrag = true; });
    this.bindTouch();
  }

  lock() {
    if (!this.mouseLockAvailable || this.canTouch || this.preferDrag || document.pointerLockElement === this.canvas) return;
    try {
      const request = this.canvas.requestPointerLock();
      request?.catch(() => { this.preferDrag = true; });
    } catch { this.preferDrag = true; }
  }

  bindTouch() {
    const pad = this.touch.querySelector('[data-stick]');
    const thumb = pad.querySelector('span');
    let anchor;
    const move = event => {
      const dx = event.clientX - anchor.x, dy = event.clientY - anchor.y;
      const radius = pad.offsetWidth * 0.35;
      const magnitude = Math.hypot(dx, dy);
      const factor = Math.min(1, radius / Math.max(1, magnitude));
      this.touchMove = [dx * factor / radius, -dy * factor / radius];
      thumb.style.transform = `translate(${dx * factor}px, ${dy * factor}px)`;
    };
    pad.addEventListener('pointerdown', event => {
      if (anchor) return;
      event.preventDefault();
      const rect = pad.getBoundingClientRect();
      anchor = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, id: event.pointerId };
      pad.setPointerCapture(event.pointerId);
      this.touch.classList.add('stick-active');
      move(event);
    });
    pad.addEventListener('pointermove', event => {
      if (anchor?.id === event.pointerId) move(event);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(name, event => {
      if (anchor?.id !== event.pointerId) return;
      anchor = null;
      this.touch.classList.remove('stick-active');
      this.touchMove = [0, 0];
      thumb.style.transform = '';
    });

    for (const button of this.touch.querySelectorAll('[data-action]')) {
      const action = button.dataset.action;
      button.addEventListener('pointerdown', event => {
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        this.touchButtons.set(event.pointerId, action);
        this.tapped.add(action);
      });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, event => {
        this.touchButtons.delete(event.pointerId);
      });
    }
  }

  poll() {
    this.actions = this.tapped;
    this.tapped = new Set();
    this.held = new Set([...this.keys].map(key => KEYS[key]).filter(Boolean));
    for (const action of this.touchButtons.values()) this.held.add(action);
    const pads = typeof navigator.getGamepads === 'function' ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    const pad = pads.find(item => item.buttons.some(button => button.pressed) || item.axes.some(axis => Math.abs(axis) > 0.19)) || pads[0];
    const padActions = new Set();
    let left = [0, 0], right = [0, 0];
    if (pad) {
      left = stick(pad.axes[0] || 0, pad.axes[1] || 0);
      right = stick(pad.axes[2] || 0, pad.axes[3] || 0, 0.13);
      pad.buttons.forEach((button, index) => {
        if (BUTTONS[index] && (button.pressed || button.value > 0.45)) padActions.add(BUTTONS[index]);
      });
      if (padActions.size || Math.hypot(...left) > 0.08 || Math.hypot(...right) > 0.08) this.lastPadUse = performance.now();
      for (const action of padActions) {
        this.held.add(action);
        if (!this.prevPad.has(action)) this.actions.add(action);
      }
    }
    this.prevPad = padActions;
    const has = (...keys) => keys.some(key => this.keys.has(key));
    const x = Number(has('KeyD', 'ArrowRight')) - Number(has('KeyA', 'ArrowLeft')) + left[0] + this.touchMove[0];
    const y = Number(has('KeyW', 'ArrowUp')) - Number(has('KeyS', 'ArrowDown')) - left[1] + this.touchMove[1];
    const length = Math.max(1, Math.hypot(x, y));
    this.move = [x / length, y / length];
    this.right = right;
    this.device = performance.now() - this.lastPadUse < 9000 ? 'controller' : this.canTouch ? 'touch' : 'keyboard';
    this.frameLook = this.look;
    this.look = [0, 0];
  }

  pressed(action) { return this.actions.has(action); }
  down(action) { return this.held.has(action); }
}
