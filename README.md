# COSM.OS

A journal that answers in a voice.

Nine voices route what you write — logic, flow, heart, body, truth, memory, myth, synthesis, and the system itself. No model, no server, no account. A deterministic rule engine picks the voice and everything you write stays in your browser's local storage.

🟦🌌🟨

---

## Run it

Open `index.html`. That's it. Works offline, works from a file, works on a phone.

## Put it on GitHub Pages

1. Create a repo and push these files to the root of the `main` branch.
2. Repo → **Settings** → **Pages**.
3. Source: **Deploy from a branch**. Branch: `main`, folder: `/ (root)`. Save.
4. Wait about a minute. Your site is at `https://<username>.github.io/<repo>/`.

The `.nojekyll` file is already included so GitHub serves every file as-is.

On iPhone, open the Pages URL in Safari → Share → **Add to Home Screen**. It installs as a standalone app and keeps working with no signal.

---

## How to use it

**chat** — write a thought, a voice answers.
**log** — write an entry, it gets dated, archived, and answered.

**Calling a voice.** Start your message with a name and that voice takes it:

```
orion  how do i structure the rest of this week
@demon  am i avoiding this
astro   why does this keep bothering me
```

**Pinning a voice.** Tap a name in the rail under the header to lock every reply to it. Tap again to release. The lock survives a refresh.

**Otherwise** the engine scores your words against each voice's keywords and picks the strongest match. No match lands on Flux.

**export / import** — download everything as JSON, or restore from a backup. Local storage can be cleared by the browser, so export anything you want to keep.

---

## The nine

| Voice | Glyph | Does |
|---|---|---|
| Orion | 🔵🧭 | logic, structure, plans, breakdowns |
| Ripple | 🟢🌊 | flow, presence, sitting with it |
| Astro | 🟡💛 | heart, meaning, why it matters |
| Brix | 🟤🧱 | body, discipline, the next physical step |
| Demon | 🔴🪞 | truth pressure, naming the avoidance |
| Echo | 🟠📡 | memory, patterns, what happened before |
| Hermes | ⚪🪽 | reframing, myth, putting it into words |
| Flux | 🟣🌀 | synthesis, holding contradictions — the default |
| COSM.OS | 🟦🌌🟨 | the container, the system talking about itself |

Two rules override everything: signs of a body running on empty route to Brix for grounding, and clear exhaustion softens Demon into Astro. Those fire before any keyword match.

---

## Make it yours

Everything you'd want to change lives in `js/personas.js`.

**Add a line to a voice** — append a string to that voice's `lines` array. `{x}` gets replaced with what you wrote.

```js
lines: [
  'Existing line.',
  'New line. What you said was "{x}" — start there.'
]
```

**Change what triggers a voice** — edit its `keys` array. Lowercase substrings, matched against your message.

**Add a whole voice** — copy a block in `PERSONAS`, give it a `name`, `glyph`, `color`, `role`, `keys`, and `lines`, then add its id to `ORDER` at the bottom of the file.

Safety overrides live at the top of `js/engine.js`.

---

## Files

```
index.html              markup
css/style.css           styles
js/personas.js          the nine voices — edit this one
js/engine.js            routing, safety overrides, persona lock
js/app.js               state, storage, rendering
sw.js                   offline cache
manifest.webmanifest    install-to-homescreen
icon.svg                app icon
.nojekyll               tells Pages to serve files untouched
```

No build step. No dependencies. No network calls.

---

## What this isn't

Not therapy, not a crisis tool, not a replacement for a person. It's a structured mirror for your own thinking. If you're in real trouble, talk to someone who can actually help.

---

Built by Alejandro "Han" Calderon Cerrillo. MIT licensed — fork it, rewrite the voices, make your own.

*Not healed. Compiled.*
