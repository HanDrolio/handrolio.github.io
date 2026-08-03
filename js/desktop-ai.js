/* COSM.OS — Electron/Ollama adapter
   Uses deterministic routing as the seed, then asks the local model to return
   one action, one insight, and one constraint. Malformed output falls back to
   grounded static content instead of leaking persona labels or prompt debris. */

(() => {
  if (!window.COSMOS_DESKTOP) return;

  const MODEL_KEY = 'cosmos_desktop_model';
  const listeners = new Set();
  const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
      action: { type: 'string' },
      insight: { type: 'string' },
      constraint: { type: 'string' }
    },
    required: ['action', 'insight', 'constraint'],
    additionalProperties: false
  };

  const FALLBACKS = {
    orion: {
      action: 'Name the smallest testable next step and run only that.',
      constraint: 'Do not expand the scope until the first step works.'
    },
    ripple: {
      action: 'Slow down one notch and notice what is actually here.',
      constraint: 'This moment does not need a forced conclusion.'
    },
    astro: {
      action: 'Name the feeling beneath the surface statement.',
      constraint: 'Meaning is an interpretation, not proof.'
    },
    brix: {
      action: 'Do one physical five-minute version of the task now.',
      constraint: 'Planning does not count as the first rep.'
    },
    demon: {
      action: 'Say the sentence you are avoiding without qualifiers.',
      constraint: 'Accuracy should challenge the story, never attack the person.'
    },
    echo: {
      action: 'Compare this moment with one concrete earlier example.',
      constraint: 'A single callback is not yet a pattern.'
    },
    hermes: {
      action: 'Give the moment one useful name, then return to the facts.',
      constraint: 'Metaphor is a lens, not literal evidence.'
    },
    flux: {
      action: 'Choose the smallest move that respects both feeling and reality.',
      constraint: 'Do not optimize every part of life at once.'
    },
    cosmos: {
      action: 'Select one useful lens and make one grounded move.',
      constraint: 'The operator keeps final authority.'
    }
  };

  let modelId = null;
  let loadPromise = null;
  let status = {
    phase: 'idle',
    progress: 0,
    text: 'checking Ollama…',
    modelId: null,
    error: null
  };

  function snapshot() {
    return { ...status };
  }

  function publish(patch) {
    status = { ...status, ...patch };
    listeners.forEach(listener => {
      try { listener(snapshot()); } catch (error) { console.error(error); }
    });
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(snapshot());
    return () => listeners.delete(listener);
  }

  function chooseModel(models) {
    const saved = localStorage.getItem(MODEL_KEY);
    if (saved && models.some(model => model.name === saved)) return saved;

    const preferred = models.find(model => /qwen/i.test(model.name)) || models[0];
    return preferred?.name || null;
  }

  function cleanSentence(value, fallback) {
    const text = String(value || '')
      .replace(/```(?:json)?/gi, '')
      .replace(/^\s*(action|insight|constraint)\s*[:—-]\s*/i, '')
      .replace(/\[(?:orion|ripple|astro|brix|demon|echo|hermes|flux|cosm(?:os|\.os)|presence)\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return fallback;
    return text.split(/(?<=[.!?])\s+/)[0].slice(0, 180).trim();
  }

  function personaFromMessages(messages) {
    const system = messages.find(message => message.role === 'system')?.content || '';
    for (const id of ORDER) {
      if (new RegExp(`\\b${PERSONAS[id].name}\\b`, 'i').test(system)) return id;
    }
    return 'flux';
  }

  function lastUserMessage(messages) {
    return [...messages].reverse().find(message => message.role === 'user')?.content?.trim() || '';
  }

  function samePersonaContext(messages, personaId, limit = 2) {
    const name = PERSONAS[personaId]?.name || 'Flux';
    const pairs = [];

    for (let index = 1; index < messages.length - 1; index += 1) {
      const user = messages[index - 1];
      const assistant = messages[index];
      if (user?.role !== 'user' || assistant?.role !== 'assistant') continue;
      if (!assistant.content.startsWith(`[${name}] `)) continue;

      pairs.push([
        { role: 'user', content: user.content },
        { role: 'assistant', content: assistant.content.slice(name.length + 3) }
      ]);
    }

    return pairs.slice(-limit).flat();
  }

  function deterministicStarter(text, personaId) {
    try {
      return route(text, personaId);
    } catch (error) {
      const p = PERSONAS[personaId] || PERSONAS.flux;
      return { persona: personaId, text: p.lines[0], override: false };
    }
  }

  function buildConstrainedMessages(messages) {
    const requestedPersona = personaFromMessages(messages);
    const input = lastUserMessage(messages);
    const routed = deterministicStarter(input, requestedPersona);
    const personaId = routed.persona || requestedPersona;
    const persona = PERSONAS[personaId] || PERSONAS.flux;
    const starter = routed.text;
    const extraAnchors = persona.lines
      .filter(line => line !== starter)
      .slice(0, 2)
      .map(line => `- ${line.replace(/\{x\}/g, 'the user’s words')}`)
      .join('\n');

    const system = `You are the ${persona.name} ${persona.glyph} language layer inside COSM.OS.

The deterministic kernel already selected this starter response:
"${starter}"

Use that starter as the primary idea and tone anchor. Expand or sharpen it; do not abandon it. Do not copy it verbatim unless it is already the clearest answer.

Additional voice anchors:
${extraAnchors}

Return exactly one JSON object matching the supplied schema:
- action: one concrete next move
- insight: one useful observation grounded in the user’s words and starter
- constraint: one boundary, uncertainty, or thing not to overclaim

Rules:
- One sentence per field.
- Keep each field under 22 words.
- No markdown, brackets, persona names, signatures, greetings, filler, or follow-up questions.
- Never say “How can I assist,” “feel free,” “your journey,” or “grow together.”
- Do not invent memories, diagnoses, patterns, hidden meanings, or facts.
- Metaphor stays metaphor. The operator keeps final judgment.`;

    return {
      personaId,
      starter,
      messages: [
        { role: 'system', content: system },
        ...samePersonaContext(messages, personaId),
        { role: 'user', content: input }
      ]
    };
  }

  function fallbackPayload(personaId, starter) {
    const base = FALLBACKS[personaId] || FALLBACKS.flux;
    return {
      action: base.action,
      insight: starter,
      constraint: base.constraint
    };
  }

  function parsePayload(raw, personaId, starter) {
    const fallback = fallbackPayload(personaId, starter);
    let parsed = null;

    try {
      const cleaned = String(raw || '')
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (error) {
      return fallback;
    }

    const payload = {
      action: cleanSentence(parsed.action, fallback.action),
      insight: cleanSentence(parsed.insight, fallback.insight),
      constraint: cleanSentence(parsed.constraint, fallback.constraint)
    };

    const combined = `${payload.action} ${payload.insight} ${payload.constraint}`;
    if (/how can i assist|feel free|your journey|grow together|\[(?:ripple|demon|astro|flux|presence)\]/i.test(combined)) {
      return fallback;
    }

    return payload;
  }

  function renderPayload(payload) {
    return `ACTION — ${payload.action}\nINSIGHT — ${payload.insight}\nCONSTRAINT — ${payload.constraint}`;
  }

  async function load() {
    if (modelId) return modelId;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      publish({ phase: 'loading', progress: 0.2, text: 'connecting to Ollama…', error: null });
      const result = await window.COSMOS_DESKTOP.status();

      if (!result.ok) throw new Error(result.error || 'Ollama is not running.');
      if (!result.models.length) throw new Error('Ollama is running, but no local models are installed.');

      modelId = chooseModel(result.models);
      localStorage.setItem(MODEL_KEY, modelId);
      publish({ phase: 'ready', progress: 1, text: 'desktop Ollama ready', modelId, error: null });
      return modelId;
    })().catch(error => {
      modelId = null;
      publish({
        phase: 'error',
        progress: 0,
        text: 'Ollama unavailable · deterministic mode active',
        modelId: null,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }).finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  }

  async function complete(messages, onUpdate) {
    if (!modelId) await load();

    const constrained = buildConstrainedMessages(messages);
    publish({ phase: 'ready', text: `thinking with ${modelId}`, modelId, error: null });

    try {
      const result = await window.COSMOS_DESKTOP.chat({
        model: modelId,
        messages: constrained.messages,
        format: RESPONSE_SCHEMA,
        temperature: 0.42,
        topP: 0.82,
        maxTokens: 120
      });

      const payload = parsePayload(result.text, constrained.personaId, constrained.starter);
      const text = renderPayload(payload);
      if (onUpdate) onUpdate(text);
      publish({ phase: 'ready', text: 'desktop Ollama ready', modelId, error: null });
      return text;
    } catch (error) {
      const text = renderPayload(fallbackPayload(constrained.personaId, constrained.starter));
      if (onUpdate) onUpdate(text);
      publish({
        phase: 'ready',
        text: 'model fallback used',
        modelId,
        error: error instanceof Error ? error.message : String(error)
      });
      return text;
    }
  }

  function isReady() {
    return Boolean(modelId);
  }

  function supportsWebGPU() {
    return false;
  }

  window.COSMOS_AI = {
    load,
    complete,
    isReady,
    subscribe,
    supportsWebGPU,
    getStatus: snapshot,
    getModel: () => modelId
  };

  load().catch(() => {});
})();