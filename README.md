# COSM.OS

A private journal that answers in a voice.

Nine deterministic voices route what you write through logic, flow, heart, body, truth, memory, myth, synthesis, and the system itself. An optional WebLLM layer can generate richer replies entirely inside the browser with WebGPU. No account and no inference server.

🟦🌌🟨

---

## Run it

Serve the folder over HTTPS or localhost. GitHub Pages works out of the box.

The deterministic mode loads immediately and remains available offline. The local model is opt-in because the first model load is a large download and may take several minutes. After WebLLM caches the model, later loads are much faster.

> Opening `index.html` directly still runs deterministic mode, but WebLLM requires a secure browser context and WebGPU.

## Put it on GitHub Pages

1. Push these files to the root of the `main` branch.
2. Repo → **Settings** → **Pages**.
3. Source: **Deploy from a branch**. Branch: `main`, folder: `/ (root)`.
4. Open the Pages URL in a current browser.

On iPhone, open the Pages URL in Safari → Share → **Add to Home Screen**.

---

## Two response engines

### Deterministic mode

Available instantly. `js/engine.js` scores keywords, honors explicit persona calls, applies grounding overrides, and returns a line from the selected voice. It does not need WebGPU or a network.

### Local AI mode

Tap **load local ai**. COSM.OS then:

1. imports WebLLM from its pinned CDN module,
2. checks WebGPU capabilities,
3. chooses the smallest compatible general-purpose chat model from WebLLM's prebuilt list,
4. downloads and caches the model locally,
5. streams replies through the persona selected by the deterministic router.

The router still decides *which voice should answer*. The model only writes the answer. Relevant journal entries are retrieved deterministically and passed in as limited local context.

If model loading or generation fails, COSM.OS falls back to the original deterministic reply instead of breaking the conversation.

---

## How to use it

**chat** — write a thought, a voice answers.

**log** — write an entry, it gets dated, archived, answered, and connected to Living Threads.

**Calling a voice** — begin with a name:

```text
orion  how do i structure the rest of this week
@demon  am i avoiding this
astro   why does this keep bothering me
```

**Pinning a voice** — tap a voice in the rail. Tap it again to release.

**export / import** — download or restore the browser-local archive as JSON.

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
| Flux | 🟣🌀 | synthesis, holding contradictions |
| COSM.OS | 🟦🌌🟨 | the container and operating layer |

Safety overrides remain deterministic and run before model generation.

---

## Files

```text
index.html                 markup and local-model controls
css/style.css              interface styles
js/personas.js             voice definitions
js/engine.js               deterministic routing and safety overrides
js/threads.js              deterministic continuity and memory retrieval
js/webllm.js               model selection, loading, status, streaming
js/webllm-worker.js        WebLLM worker thread
js/app.js                  state, storage, rendering, prompt assembly
sw.js                      offline shell cache
manifest.webmanifest       install-to-homescreen metadata
icon.svg                   app icon
.nojekyll                  serve files untouched on GitHub Pages
```

No build step is required.

---

## Privacy reality check

Journal data and generated inference stay in the browser. Loading the model still contacts the WebLLM CDN, GitHub-hosted model libraries, and the model host to download software and weights. After those assets are cached, inference itself runs locally.

Browser storage can be cleared by the user, the OS, or storage pressure. Export anything you care about.

---

## What this isn't

Not therapy, not a crisis tool, and not a replacement for human judgment. It is a structured mirror. The operator holds the pen.

Built by Alejandro "Han" Calderon Cerrillo. MIT licensed.

*Not healed. Compiled.*
