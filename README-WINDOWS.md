# COSM.OS for Windows

This branch packages the existing COSM.OS site as a private Electron desktop app and connects it to a local Ollama model.

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
- Preference for an installed Qwen model
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

The desktop adapter automatically selects a Qwen model when one is installed. Otherwise it selects the first model returned by Ollama.

## Build a Windows installer

```powershell
npm run dist
```

The installer will appear in the `dist` folder with a name similar to:

```text
COSM.OS-Setup-0.1.0.exe
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

## Troubleshooting

### The app says Ollama is unavailable

Confirm Ollama is running:

```powershell
ollama list
```

Then restart COSM.OS.

### The app uses deterministic responses

This is the intended fallback when Ollama is stopped, no model is installed, or generation fails.

### The first answer is slow

Ollama may be loading the model into memory. Later responses are usually quicker while the model remains loaded.
