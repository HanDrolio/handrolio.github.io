# COSM.OS for Windows

This branch packages COSM.OS as a private Electron desktop app connected to a local Ollama model.

See [`CHANGELOG.md`](./CHANGELOG.md) for the version history.

## v0.7 response architecture

COSM.OS 0.7 removes the prompt machinery that made small models overthink.

### Chat mode

```text
selected persona prompt
      ↓
last three raw exchanges
      ↓
current user message
      ↓
selected local Ollama model
```

No starter banks, curated examples, hidden JSON schema, automatic memory injection, persona scoring, or response rewriting are added to the request.

When no persona is selected, chat defaults to **Flux**.

### Log mode

```text
selected persona prompt
      ↓
current log entry only
      ↓
selected local Ollama model
```

Log mode receives no chat history and no retrieved memories. When no persona is selected, log defaults to **Ripple**.

### Explicit commands

Commands run deterministic local code only when the entire message begins with the command name or slash form:

```text
remember <exact note>
summary
plan <goal>
```

- `remember` stores the exact note in the local journal.
- `summary` creates an extractive logical bookmark from the recent chat.
- `plan` returns a fixed three-step test plan.

Ordinary uses of those words inside sentences do not trigger commands.

## Desktop features

- Native Windows window
- Secure preload bridge to Ollama at `127.0.0.1:11434`
- Automatic installed-model discovery
- **auto · largest Qwen** selection
- Manual model selection and refresh
- Multi-chat local sidebar
- Nine compact persona prompts
- One-shot journal reflections
- Generation-only Model Lab with saved presets
- JSON import and export
- Deterministic local commands
- LocalStorage archive

## Requirements

1. Windows 10 or newer
2. Ollama installed and running
3. At least one model visible in:

```powershell
ollama list
```

Recommended target for the current ThinkCentre:

```powershell
ollama pull qwen2.5:3b
```

## Run from source

```powershell
npm install
npm start
```

## Build the installer

```powershell
npm run dist
```

Output:

```text
dist/COSM.OS-Setup-0.7.0.exe
```

## Security boundary

```text
COSM.OS renderer
      ↓ secure preload API
Electron main process
      ↓ localhost only
Ollama API
      ↓
installed local model
```

The renderer has no Node.js or shell access. External navigation is blocked inside the app.

## Troubleshooting

### Ollama is unavailable

Run:

```powershell
ollama list
```

Then restart COSM.OS or press `↻`.

### A new model is missing

Press `↻`. Auto mode selects the largest installed Qwen, or choose a model manually.

### The first answer is slow

Ollama may be loading the model into memory. Later answers are usually faster while it stays loaded.

### The response still sounds generic

Try the **Precise** or **Calm** generation preset. The prompt path is intentionally minimal; further fixes should begin with the persona prompt or model choice rather than adding hidden prompt layers.
