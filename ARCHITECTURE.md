# COSM.OS modular architecture

This branch rebuilds the app around small, replaceable layers so features can be added without editing one giant application file.

## Runtime flow

```text
index.html
  └─ persona registry data
      └─ js/v2/main.js
          ├─ store.js      state container
          ├─ storage.js    browser persistence + legacy migration
          ├─ router.js     deterministic persona routing + hard safety rules
          ├─ threads.js    Living Threads / local continuity
          ├─ prompts.js    model context assembly
          ├─ ai.js         optional WebLLM engine only
          └─ ui.js         DOM rendering + browser events only
```

`main.js` is the coordinator. It asks the modules to do work but does not contain WebLLM internals, storage internals, or persona routing logic.

## Rules for future changes

- New persona wording or keywords: edit `js/personas.js` only.
- New routing behavior: edit `js/v2/router.js` only.
- New journal/thread behavior: edit `js/v2/threads.js` only.
- New model, model policy, or WebLLM fix: edit `js/v2/ai.js` only.
- New context/memory prompt behavior: edit `js/v2/prompts.js` only.
- UI markup/render behavior: edit `js/v2/ui.js` and CSS.
- App actions/workflows: edit `js/v2/main.js`.
- Storage schema changes: edit `js/v2/storage.js` and bump its version.

This separation is intentional so future chat-driven edits stay surgical.

## WebLLM policy

WebLLM is optional. Deterministic mode is always the fallback.

The v2 AI service:

1. checks secure-context + WebGPU support,
2. uses a smaller mobile model policy on iPhone/iPad,
3. runs the engine directly instead of through a WebGPU worker,
4. records interrupted loads separately from successful loads,
5. never pretends a cached model is still resident in RAM after a page reload,
6. exposes status through `window.COSMOS_DEBUG.ai()`.

A browser reload always destroys the live JavaScript/WebGPU engine. Cached weights can make restoring much faster, but the engine still has to be re-created.

## Service worker policy

The old service worker was cache-first for local JavaScript. That made deployed fixes easy to hide behind stale cached files.

The v2 worker is network-first for same-origin app files and falls back to the cache only when offline. External WebLLM/model requests are left alone so WebLLM can manage its own cache.

## Debugging from chat

Open the browser console and inspect:

```js
COSMOS_DEBUG.version
COSMOS_DEBUG.ai()
COSMOS_DEBUG.state()
await COSMOS_DEBUG.storage()
COSMOS_DEBUG.device
```

Those values are intentionally compact enough to paste or screenshot back into a chat when something breaks.

## Data compatibility

`storage.js` migrates the existing `cosmos_v3` browser state into `cosmos_v4` without deleting the legacy value. Existing chat messages and journal entries are preserved.
