# COSM.OS for Windows

This branch packages the existing COSM.OS site as a private Electron desktop app and connects it to a local Ollama model.

See [`CHANGELOG.md`](./CHANGELOG.md) for the complete version-by-version record of the Windows build session, response-engine experiments, sidebar, persona prompts, model selection, and Model Lab.

## What stays the same

- Existing chat and journal interface
- Deterministic persona router and safety overrides
- LocalStorage archive
- Import and export
- Browser/WebLLM fallback for the GitHub Pages edition

## What the desktop edition adds

- Native Windows window
- Safe Electron bridge to Ollama at `127.0.0.1:11434`
- Automatic model detection
- Preference for the largest installed Qwen model in auto mode
- Manual model selection and model refresh
- Multi-chat local sidebar
- Persistent persona prompts
- Relevant persona starter sparks and curated examples
- Natural hidden `yes_and`, `no_but`, and `maybe_so` conversation moves
- Model Lab tuning controls, resonance filtering, and saved presets
- Deterministic fallback when Ollama is unavailable
- Installer and portable build commands

## Requirements

1. Windows 10 or newer
2. Node.js installed
3. Ollama installed and running
4. At least one Ollama model visible in:

```powershell
ollama list
```

## Run the app from source

Open PowerShell in the repository folder:

```powershell
npm install
npm start
```

The desktop adapter defaults to **auto · largest Qwen**. Use the model dropdown to select a specific installed model or press `↻` to rescan Ollama after downloading a new one.

## Build a Windows installer

```powershell
npm run dist
```

The installer will appear in the `dist` folder with a name similar to:

```text
COSM.OS-Setup-0.6.0.exe
```

## Build a portable executable

```powershell
npm run dist:portable
```

## Architecture

```text
COSM.OS renderer
      ↓ secure preload API
Electron main process
      ↓ localhost only
Ollama API
      ↓
installed local model
```

The renderer never receives Node.js or shell access. Ollama calls are validated and performed inside the Electron main process.

The response path is:

```text
deterministic route + safety
      ↓
persona prompt + optional resonance filter
      ↓
relevant starters + examples + clean same-persona context
      ↓
local Ollama generation
      ↓
validation + visible word cap
      ↓
local chat or journal archive
```

## Troubleshooting

### The app says Ollama is unavailable

Confirm Ollama is running:

```powershell
ollama list
```

Then restart COSM.OS or press the model refresh button.

### A newly downloaded model is missing

Press `↻` in the model bar. Auto mode will select the largest installed Qwen. You can also choose the model manually from the dropdown.

### The app uses deterministic responses

This is the intended fallback when Ollama is stopped, no model is installed, or generation fails.

### The first answer is slow

Ollama may be loading the model into memory. Later responses are usually quicker while the model remains loaded.

### Responses feel generic or too rigid

Open the `⚙` Model Lab and adjust the active preset, temperature, top-p, repetition penalty, context depth, starter count, example count, visible word cap, or Resonance Filter prompt.
