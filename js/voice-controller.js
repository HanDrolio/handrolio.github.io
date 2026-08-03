/* COSM.OS — minimalist Ollama controller v0.7
   Sends the message array exactly as assembled by app.js. */

(() => {
  if (!window.COSMOS_DESKTOP || !window.COSMOS_AI) return;

  const baseAI = window.COSMOS_AI;

  function tuning() {
    return window.COSMOS_MODEL_SETTINGS?.get?.() || {
      temperature: 0.72,
      topP: 0.9,
      repeatPenalty: 1.08,
      maxTokens: 220,
      numCtx: 4096
    };
  }

  async function complete(messages, onUpdate) {
    if (!baseAI.isReady()) await baseAI.load();

    const model = baseAI.getModel();
    if (!model) throw new Error('No Ollama model is selected.');

    const settings = tuning();
    const result = await window.COSMOS_DESKTOP.chat({
      model,
      messages,
      temperature: settings.temperature,
      topP: settings.topP,
      repeatPenalty: settings.repeatPenalty,
      maxTokens: settings.maxTokens,
      numCtx: settings.numCtx
    });

    const text = String(result.text || '').trim();
    if (!text) throw new Error('The local model returned an empty response.');
    if (onUpdate) onUpdate(text);
    return text;
  }

  window.COSMOS_AI = {
    ...baseAI,
    complete,
    getTuning: tuning
  };
})();
