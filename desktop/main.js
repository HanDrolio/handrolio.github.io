const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');

const OLLAMA_BASE_URL = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const REQUEST_TIMEOUT_MS = 180_000;

function normalizeBaseUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/$/, '');
  if (!trimmed) return 'http://127.0.0.1:11434';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

async function ollamaRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${normalizeBaseUrl(OLLAMA_BASE_URL)}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      signal: controller.signal
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Ollama returned ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    return response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Ollama took too long to respond. The model may still be loading.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function listModels() {
  const data = await ollamaRequest('/api/tags');
  return (data.models || [])
    .map(model => ({
      name: model.name || model.model,
      size: model.size || 0,
      modifiedAt: model.modified_at || null
    }))
    .filter(model => Boolean(model.name));
}

ipcMain.handle('ollama:status', async () => {
  try {
    const models = await listModels();
    return {
      ok: true,
      baseUrl: normalizeBaseUrl(OLLAMA_BASE_URL),
      models
    };
  } catch (error) {
    return {
      ok: false,
      baseUrl: normalizeBaseUrl(OLLAMA_BASE_URL),
      models: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
});

ipcMain.handle('ollama:models', async () => listModels());

ipcMain.handle('ollama:chat', async (_event, payload = {}) => {
  const model = String(payload.model || '').trim();
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  if (!model) throw new Error('No Ollama model is selected.');
  if (!messages.length) throw new Error('No chat messages were provided.');

  const requestBody = {
    model,
    messages,
    stream: false,
    options: {
      temperature: Number.isFinite(payload.temperature) ? payload.temperature : 0.72,
      top_p: Number.isFinite(payload.topP) ? payload.topP : 0.9,
      repeat_penalty: Number.isFinite(payload.repeatPenalty) ? payload.repeatPenalty : 1.08,
      num_predict: Number.isFinite(payload.maxTokens) ? payload.maxTokens : 220,
      num_ctx: Number.isFinite(payload.numCtx) ? payload.numCtx : 4096
    }
  };

  if (payload.format && typeof payload.format === 'object') {
    requestBody.format = payload.format;
  }

  const data = await ollamaRequest('/api/chat', {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });

  return {
    text: String(data.message?.content || '').trim(),
    model: data.model || model,
    totalDuration: data.total_duration || null,
    promptEvalCount: data.prompt_eval_count || null,
    evalCount: data.eval_count || null
  };
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: '#06080f',
    title: 'COSM.OS',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, '..', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(target)) shell.openExternal(target);
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});