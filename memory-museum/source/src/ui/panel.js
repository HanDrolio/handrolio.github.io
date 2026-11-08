export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function button(label, action, options = {}) {
  const { kind = '', id, disabled = false } = options;
  return `<button type="button" class="button ${kind}" data-do="${action}"${id ? ` data-id="${escapeHTML(id)}"` : ''}${disabled ? ' disabled' : ''}>${escapeHTML(label)}</button>`;
}

export class Panel {
  constructor(dialog) {
    this.dialog = dialog;
    dialog.addEventListener('cancel', event => { event.preventDefault(); this.close?.(); });
    dialog.addEventListener('click', event => {
      const control = event.target.closest('button[data-do]');
      if (!control) return;
      if (control.dataset.do === 'close') this.close?.();
      else this.activate?.(control.dataset.do, control.dataset.id, control);
    });
    dialog.addEventListener('submit', event => {
      event.preventDefault();
      this.submit?.(event.target, new FormData(event.target));
    });
  }

  show({ title, kicker, body, close, activate, submit }) {
    Object.assign(this, { close, activate, submit });
    this.dialog.innerHTML = `<div class="panel-inner">
      <header class="panel-head"><span class="eyebrow">${escapeHTML(kicker)}</span>
      <h2 id="panel-title">${escapeHTML(title)}</h2>
      <button type="button" class="close-panel" data-do="close" aria-label="Close">×</button></header>${body}</div>`;
    if (!this.dialog.open) this.dialog.showModal();
    this.dialog.scrollTop = 0;
    this.dialog.querySelector('.close-panel').focus({ preventScroll: true });
  }

  hide() {
    if (this.dialog.open) this.dialog.close();
    this.dialog.innerHTML = '';
  }

  find(selector) { return this.dialog.querySelector(selector); }

  moveFocus(direction) {
    const controls = Array.from(this.dialog.querySelectorAll('button:not(:disabled), select, input, textarea, audio[controls], video[controls]'))
      .filter(element => !element.closest('[hidden]'));
    const current = controls.indexOf(document.activeElement);
    controls[(current + direction + controls.length) % controls.length]?.focus({ preventScroll: false });
  }

  error(message) {
    const node = this.find('.form-error');
    if (node) node.textContent = message;
  }
}
