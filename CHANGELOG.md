# COSM.OS Changelog

This document records the Windows desktop work completed during the August 3, 2026 build session.

> Branch: `windows-desktop-mvp`  
> Draft PR: `#3`  
> Public GitHub Pages branch: unchanged during this work

## 0.6.0 — Model Lab and Resonance Filter

### Added

- Added a dedicated **Model Lab** opened from the model bar with the `⚙` button.
- Added persistent local controls for:
  - temperature
  - top-p
  - repetition penalty
  - generated token cap
  - Ollama context window
  - visible response word cap
  - number of previous same-persona turns
  - number of persona starter sparks
  - number of curated conversation examples
- Added an editable **Resonance Filter** prompt injected after the persona prompt and before generation.
- Added local custom preset creation, selection, deletion, and persistence.
- Added built-in presets:
  - Balanced conversation
  - Ripple calm
  - Orion precise
  - KABLOW creative
  - Deep conversation
- Added client-side word capping after generation.
- Forwarded repetition penalty and context-window settings through Electron to Ollama.
- Added syntax validation for the model-settings layer to the Windows CI workflow.

### Resonance behavior

The default filter tells the model to remove textbook language, therapist scripts, corporate support language, generic advice, and commentary about how it is responding. It asks for concrete language, emotional honesty, and one vivid observation instead of a lecture.

### Files

- `js/model-settings.js`
- `css/model-settings.css`
- `js/voice-controller.js`
- `desktop/main.js`
- `index.html`
- `.github/workflows/build-windows.yml`

---

## 0.5.0 — Multi-chat Sidebar, Model Selection, and Persona Prompts

### Chat history

- Replaced the single flat message array with a local multi-chat archive.
- Added a collapsible ChatGPT-style sidebar.
- Added new-chat creation.
- Added chat switching.
- Added chat deletion with confirmation.
- Added chat renaming by double-clicking a title.
- Added automatic chat titles based on the first user message.
- Added per-chat timestamps and sorting by latest activity.
- Added responsive mobile sidebar behavior and a backdrop.
- Migrated existing legacy `messages` data into one preserved chat automatically.
- Kept all chat data local in `localStorage`.

### Model discovery and selection

- Added an installed-model dropdown.
- Added a refresh button to rescan Ollama.
- Added an **auto · largest Qwen** mode.
- Auto mode prefers installed Qwen models and selects the largest by file size.
- Added manual model selection and persistence.
- Added support for upgrading from the existing Qwen 2.5 1.5B model to Qwen 2.5 3B without changing application code.

### Persona prompts

- Added persistent custom prompts for every voice:
  - 🔵🧭 Orion — logic, planning, constraints, and testable steps
  - 🟢🌊 Ripple — journaling, calm, presence, and ordinary moments
  - 🟡💛 Astro — love, emotion, tenderness, grief, and meaning
  - 🟤🧱 Brix — body, discipline, and concrete action
  - 🔴🪞 Demon — friction, contradiction, roast, and truth-pressure
  - 🟠📡 Echo — memory, continuity, and evidence-based patterns
  - ⚪🪽 Hermes — myth, metaphor, names, and story
  - 🟣🌀 Flux — synthesis and natural conversation
  - 🟦🌌🟨 COSM.OS — architecture, systems, and human sovereignty
- Injected the selected persona prompt before every generated response.
- Explicitly separated metaphor from fact and preserved the operator's final judgment.

### Export behavior

- Export now includes the entire multi-chat array, the current chat ID, journal entries, mode, lock state, and sidebar state.
- Ollama model files are not included in exports.
- Model Lab presets and tuning settings are stored in separate local-storage keys and are not yet bundled into the main JSON export.

### Files

- `js/app.js`
- `js/desktop-ai.js`
- `js/persona-prompts.js`
- `index.html`
- `css/style.css`

---

## 0.4.0 — Natural Conversation Engine

### Changed

- Replaced the visible `ACTION / INSIGHT / CONSTRAINT` format with natural conversational replies.
- Added three hidden conversational moves:
  - `yes_and` — join the direction and add something alive
  - `no_but` — challenge or correct, then offer a better direction
  - `maybe_so` — preserve uncertainty and explore without pretending to know
- Kept the move inside structured JSON while showing only the natural reply.
- Told Qwen that its main goal is to have a real conversation and discover new insights only when they naturally appear.
- Allowed greetings, jokes, hype, stories, and casual chatter to remain casual.
- Increased same-persona context while filtering contaminated historical replies.
- Added fallback replies for greetings, `kablow`, casual conversation, laughter, and simple reactions.
- Added stronger rejection of meta-language such as:
  - “the user”
  - “how can I assist”
  - “informative tone”
  - “effective communication”
  - visible response labels
- Prevented the model from explaining what kind of response it was producing.

### Why

Testing showed that the structured format stopped persona contamination but made ordinary conversation sound like bureaucratic caveman paperwork. The new controller kept structure underneath while letting the visible response flow naturally.

---

## 0.3.0 — Voice Training Data and Relevant Starter Selection

### Starter banks

- Added exactly **50 starter lines for each voice**.
- Combined 25 canonical persona lines with 25 new lines per voice.
- Total starter lines: **450** across nine voices.
- Added keyword-overlap scoring.
- Added deterministic tie-breaking.
- Ranked the deterministic fallback and starter bank together instead of always forcing the fallback first.
- Selected only the most relevant starter sparks for each user message.

### Conversation examples

- Added **36 curated conversation examples**: four per voice.
- Adapted examples from earlier COSM.OS conversations and testing archives.
- Used examples to teach cadence and conversational motion rather than treating historical text as factual authority.
- Selected examples by relevance to the current input.
- Avoided sending the raw full archive to Qwen.

### Persona isolation

- Limited carried context to matching persona exchanges.
- Filtered old replies containing persona-label soup, visible response forms, or generic assistant language.
- Kept old contaminated conversations in the archive without allowing them to train the active prompt.

### Files

- `js/voice-training.js`
- `js/voice-controller.js`
- `index.html`

---

## 0.2.0 — Structured Response Stabilization

### Added

- Added a strict JSON response schema:
  - `action`
  - `insight`
  - `constraint`
- Added deterministic starter selection as a model anchor.
- Added two supporting persona anchors.
- Added same-persona conversation context.
- Added low-temperature generation settings for more stable output.
- Added JSON parsing and malformed-output fallback.
- Added stripping of persona names, brackets, signatures, and labels.
- Added rejection of generic phrases such as:
  - “how can I assist”
  - “feel free to”
  - “your journey”
  - “grow together”
  - “as an AI”
- Added deterministic fallback content when parsing failed or the model produced sludge.
- Forwarded Ollama JSON schema format through Electron.

### Result

This version largely stopped cross-persona label stacking and made responses parseable, but it was intentionally replaced by the more natural 0.4.0 conversational renderer.

---

## 0.1.0 — Windows Desktop MVP

### Desktop shell

- Packaged the existing COSM.OS interface in Electron.
- Added a Windows NSIS installer and portable build command.
- Added a secure preload bridge.
- Kept Node.js and shell access out of the renderer.
- Enabled:
  - `contextIsolation: true`
  - `nodeIntegration: false`
  - `sandbox: true`
- Blocked in-app navigation to external pages.
- Opened permitted external links in the system browser.

### Ollama integration

- Connected to Ollama through `OLLAMA_HOST` or `http://127.0.0.1:11434`.
- Added `/api/tags` model discovery.
- Added `/api/chat` generation.
- Kept requests non-streaming for the MVP.
- Added a three-minute request timeout for slow CPU model loading.
- Preserved the deterministic persona router and safety overrides as an offline fallback.
- Kept the browser/WebLLM edition separate and functional.

### Build system

- Added `package.json` scripts:
  - `npm start`
  - `npm run dist`
  - `npm run dist:portable`
- Added GitHub Actions Windows packaging.
- Added JavaScript syntax checks before packaging.
- Added `README-WINDOWS.md` with setup, architecture, build, and troubleshooting notes.
- Kept the Windows work isolated on `windows-desktop-mvp` in draft PR #3.

---

## Testing and Diagnosis During the Session

A large exported conversation archive was reviewed to identify failure modes. Testing exposed:

- persona-label stacking such as Ripple, Demon, Astro, and Presence appearing together
- signatures from the wrong persona
- generic customer-service filler
- replies describing how they would respond instead of actually responding
- forced advice during greetings, jokes, boredom, coffee, dogs, and casual conversation
- invented motives and feelings
- repetition after the user corrected the model
- story continuity failures
- failure to honor direct corrections such as “do not call me my dear”
- confusion about what COSM.OS is
- incorrect assumptions that a larger model automatically adds application features

The response pipeline was revised repeatedly around those observed failures rather than around benchmark scores alone.

### Core test prompts used

- `hello`
- `kablow`
- `just chilling`
- `my dog is sleeping like he pays rent`
- `i should build five new features tonight`
- `weed makes every idea better`
- `should i download a bigger model already?`
- `continue what you were just saying`
- `disagree with me without becoming annoying`
- `say something i haven't noticed yet`
- persona-locked tests for Ripple, Demon, Orion, Astro, Hermes, and COSM.OS

---

## Final Architecture After This Session

```text
user message
    ↓
deterministic routing + safety override
    ↓
persistent persona prompt
    ↓
optional resonance filter
    ↓
relevant persona starter sparks
    ↓
relevant curated conversation examples
    ↓
clean same-persona conversation context
    ↓
selected local Ollama model
    ↓
structured hidden move + natural reply
    ↓
validation, anti-sludge checks, and word cap
    ↓
chat or journal UI
    ↓
localStorage archive
```

The deterministic layer controls routing and fallback behavior. Qwen supplies language variation. The archive supplies limited relevant context. The operator keeps final judgment.

---

## Builds Produced

Windows installers and ZIP artifacts were successfully produced during this session for:

- 0.2.0
- 0.3.0
- 0.4.0
- 0.5.0
- 0.6.0

The 0.6.0 GitHub Actions workflow passed JavaScript validation, dependency installation, Windows packaging, and artifact upload.

---

## Known Limitations and Next Steps

- Qwen 2.5 3B still needs extended real-device comparison against the 1.5B model on the target ThinkCentre.
- The Windows installer is unsigned and may trigger Microsoft SmartScreen.
- The current main JSON export does not yet include Model Lab settings or custom tuning presets.
- Ollama model files must be installed separately and are never included in COSM.OS backups.
- The app still uses `localStorage`; SQLite or a dedicated local database remains a future option.
- Generation is non-streaming.
- Memory retrieval is deterministic keyword/thread retrieval, not embedding search.
- Draft PR #3 remains unmerged so the live GitHub Pages site is untouched.

---

## Project Law Preserved Throughout

> The system may help the operator think. It may never replace the operator's judgment.
