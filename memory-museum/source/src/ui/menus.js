import { codeText, GLYPH_NAMES, glyphIndices } from '../core/seed.js';
import { button, escapeHTML as esc } from './panel.js';

const controlRows = [
  ['Move / look', 'WASD / mouse', 'Left / right stick'],
  ['Sprint / jump', 'Shift / Space', 'RT / LT'],
  ['Slide / crouch', 'Ctrl / C', 'LB / X'],
  ['Interact / integrate', 'E / hold E', 'A / hold A'],
  ['Persona wheel', 'Hold Q, arrows, release', 'Hold RB, right stick, release'],
  ['Notebook / back', 'J / Esc', 'Y / B'],
  ['Pause / resume', 'Esc', 'START / Menu'],
  ['Flashlight / sit', 'F / V', 'D-pad ↑ / ↓'],
  ['Browse exhibits', '[ / ]', 'D-pad ← / →'],
];

export function controlsBody(fromEntrance) {
  return `<p class="panel-copy">The Rotunda is your starting point. Look at a pedestal and interact when its label appears. The notebook holds your archive.</p>
  <table class="key-table"><thead><tr><th scope="col">Action</th><th scope="col">Keyboard</th><th scope="col">Backbone</th></tr></thead><tbody>
  ${controlRows.map(([name, key, pad]) => `<tr><td>${name}</td><td><kbd>${key}</kbd></td><td><kbd>${pad}</kbd></td></tr>`).join('')}</tbody></table>
  <p class="hint">On touch, use the left stick to move and drag the scene to look. Tap A at an exhibit and Ⅱ to pause. On Backbone, START / Menu opens the pause screen, where Controls is available. If mouse lock is unavailable, drag to look.</p>
  <div class="actions">${button(fromEntrance ? 'Back to entrance' : 'Back to pause', 'close', { kind: 'primary' })}</div>`;
}

export function pauseBody(persona, config, isShared) {
  return `<p class="panel-copy">${persona.name} is active. Your notebook and exhibit notes are stored on this device.</p>
  <label class="setting-row">Sound volume <input name="volume" aria-label="Sound volume" type="range" min="0" max="1" step=".05" value="${config.volume}"></label>
  <label class="setting-row">Mute <input name="muted" type="checkbox" ${config.muted ? 'checked' : ''}></label>
  <label class="setting-row">Look sensitivity <input name="lookSpeed" aria-label="Look sensitivity" type="range" min=".45" max="2.2" step=".05" value="${config.lookSpeed}"></label>
  <label class="setting-row">Reduced motion <input name="reduced" type="checkbox" ${config.reduced ? 'checked' : ''}></label>
  <label class="setting-row">Touch controls <select name="touch" aria-label="Touch controls" style="width:auto">
  ${[['auto', 'Automatic'], ['always', 'Always show'], ['never', 'Hide']].map(([key, label]) => `<option value="${key}"${config.touch === key ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
  <div class="actions">${button('Resume', 'close', { kind: 'primary' })}${button('Controls', 'controls')}
    ${button('Return to Rotunda', 'rotunda')}${button(isShared ? 'Seed visit' : 'Daily seed', 'seed')}${button('Entrance', 'entrance')}</div>`;
}

export function seedBody(day, shared) {
  const count = day.newEntries.length;
  const names = glyphIndices(day.code).map(index => GLYPH_NAMES[index]).join(', ');
  const date = new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return `<p class="panel-copy">${shared ? 'You are walking a shared layout with your own archive.' : `${date}. The halls change at 4:44 AM local time.`}</p>
  <div class="seed-big" aria-label="${names}">${day.glyphs.join(' · ')}</div>
  <span class="seed-code">${codeText(day.code)}</span>
  <div class="seed-stats"><div><strong>${count}</strong><span>NEW EXHIBITS</span></div>
  <div><strong>${day.migrations.size}</strong><span>MEMORIES AWAY FROM HOME</span></div></div>
  <form data-form="seed"><label class="stack-label">Visit a seed <input class="field" name="code" autocomplete="off" placeholder="Four glyphs or a four-character code" required></label>
  <p class="form-error" role="alert"></p>
  <div class="actions"><button type="submit" class="button primary">Visit seed</button>
  ${button('Copy seed link', 'share')}${shared ? button('Back to my daily layout', 'today') : ''}</div></form>
  <p class="hint">A seed link shares the layout code. Your journal, notes, and media stay on this device.</p>`;
}
