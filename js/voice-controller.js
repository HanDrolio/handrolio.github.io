/* COSM.OS — desktop conversation controller v6
   Persona prompts, resonance filtering, few-shot voice anchors, and user-tuned
   Ollama generation settings cooperate before every local response. */

(() => {
  if (!window.COSMOS_DESKTOP || !window.COSMOS_AI || !window.COSMOS_VOICE_DATA) return;

  const baseAI = window.COSMOS_AI;
  const voiceData = window.COSMOS_VOICE_DATA;

  const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
      move: { type: 'string', enum: ['yes_and', 'no_but', 'maybe_so'] },
      reply: { type: 'string' }
    },
    required: ['move', 'reply'],
    additionalProperties: false
  };

  const VALID_MOVES = new Set(['yes_and', 'no_but', 'maybe_so']);
  const META_SLOP = /\b(the user|respond(?:ing)?|response|informative tone|empathetic tone|effective communication|clear actionable guidance|provide a clean answer|underlying desire|how can i assist|feel free|your journey|grow together|do not overclaim|action\s*[—:-]|insight\s*[—:-]|constraint\s*[—:-])\b/i;

  function tuning() {
    return window.COSMOS_MODEL_SETTINGS?.get?.() || {
      temperature: 0.76,
      topP: 0.94,
      repeatPenalty: 1.08,
      maxTokens: 260,
      numCtx: 4096,
      contextTurns: 4,
      starterCount: 3,
      exampleCount: 2,
      maxWords: 130,
      resonance: true,
      resonancePrompt: ''
    };
  }

  function personaFromMessages(messages) {
    const system = messages.find(message => message.role === 'system')?.content || '';
    for (const id of ORDER) {
      const escaped = PERSONAS[id].name.replace('.', '\\.');
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(system)) return id;
    }
    return 'flux';
  }

  function lastUserMessage(messages) {
    return [...messages].reverse().find(message => message.role === 'user')?.content?.trim() || '';
  }

  function samePersonaContext(messages, personaId, limit) {
    if (!limit) return [];
    const name = PERSONAS[personaId]?.name || 'Flux';
    const pairs = [];

    for (let index = 1; index < messages.length - 1; index += 1) {
      const user = messages[index - 1];
      const assistant = messages[index];
      if (user?.role !== 'user' || assistant?.role !== 'assistant') continue;
      if (!assistant.content.startsWith(`[${name}] `)) continue;

      const reply = assistant.content.slice(name.length + 3).trim();
      if (!reply || /\bACTION\s*—|\bINSIGHT\s*—|\bCONSTRAINT\s*—/i.test(reply)) continue;
      if (META_SLOP.test(reply)) continue;

      pairs.push([
        { role: 'user', content: user.content },
        { role: 'assistant', content: reply }
      ]);
    }

    return pairs.slice(-limit).flat();
  }

  function fallbackReply(input, starter) {
    const text = String(input || '').trim();
    const lower = text.toLowerCase();

    if (/^(hey|hi|hello|yo|sup|what'?s up|whats up)\b/.test(lower)) {
      return "yo, what’s good? i’m here.";
    }
    if (/^kablow\b/.test(lower)) {
      return 'KABLOW 😂 okay, what just clicked?';
    }
    if (/just (wanna|want to) (talk|have a conversation)|just saying what'?s up|don'?t need a plan/.test(lower)) {
      return 'yeah, then let’s just talk. no plan, no diagnosis, no tiny productivity clipboard.';
    }
    if (/^(lol|lmao|haha|bruh|bro|damn)\b/.test(lower)) {
      return 'lmao yeah, i’m with you.';
    }

    return String(starter || 'yeah… keep going.').replace(/\{x\}/g, text).trim();
  }

  function capWords(text, maxWords) {
    const words = String(text || '').trim().split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return words.join(' ');
    return `${words.slice(0, maxWords).join(' ').replace(/[,:;—-]+$/, '')}…`;
  }

  function cleanReply(value, fallback, maxWords) {
    let text = String(value || '')
      .replace(/```(?:json)?/gi, '')
      .replace(/^\s*(yes_and|no_but|maybe_so|yes,?\s*and|no,?\s*but|maybe,?\s*so)\s*[:—-]\s*/i, '')
      .replace(/\[(?:orion|ripple|astro|brix|demon|echo|hermes|flux|cosm(?:os|\.os)|presence)\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text || META_SLOP.test(text)) return capWords(fallback, maxWords);
    if (/^[{[]/.test(text) || /[}\]]$/.test(text)) return capWords(fallback, maxWords);

    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 8);
    text = sentences.join(' ').slice(0, 1800).trim();
    if (text.split(/\s+/).length < 2) return capWords(fallback, maxWords);
    return capWords(text, maxWords);
  }

  function inferExampleMove(example) {
    const input = String(example.input || '').toLowerCase();
    const constraint = String(example.constraint || '').toLowerCase();

    if (/\b(maybe|don'?t know|what does|reminds me|could this|might)\b/.test(input)) {
      return 'maybe_so';
    }
    if (/\b(keeps? mixing|instead of|can'?t|should i|roast|quit|failed|fell apart|exhausted)\b/.test(input) ||
        /\b(do not|not evidence|cannot|should not|only after)\b/.test(constraint)) {
      return 'no_but';
    }
    return 'yes_and';
  }

  function naturalExampleReply(example) {
    const insight = String(example.insight || '').trim();
    const action = String(example.action || '').trim();
    return [insight, action].filter(Boolean).join(' ');
  }

  function fewShotMessages(examples) {
    return examples.flatMap(example => [
      { role: 'user', content: example.input },
      {
        role: 'assistant',
        content: JSON.stringify({
          move: inferExampleMove(example),
          reply: naturalExampleReply(example)
        })
      }
    ]);
  }

  function buildRequest(messages) {
    const settings = tuning();
    const requestedPersona = personaFromMessages(messages);
    const input = lastUserMessage(messages);
    const routed = route(input, requestedPersona);
    const personaId = routed.persona || requestedPersona;
    const persona = PERSONAS[personaId] || PERSONAS.flux;
    const personaPrompt = window.PERSONA_PROMPTS?.[personaId] || '';

    const starters = voiceData.selectStarters(personaId, input, settings.starterCount, routed.text);
    const starter = starters[0] || routed.text || persona.lines[0];
    const anchors = starters.slice(1);
    const examples = voiceData.selectExamples(personaId, input, settings.exampleCount);
    const resonance = settings.resonance && settings.resonancePrompt
      ? `\n\nRESONANCE FILTER\n${settings.resonancePrompt}`
      : '';

    const system = `${personaPrompt}${resonance}

Your immediate goal is to have a real conversation with the operator. Follow what they are actually saying, continue the living thread, and discover a fresh insight together only when one naturally appears. Never talk about how you are responding.

Choose one hidden conversational move:
- yes_and: join the direction and add something alive
- no_but: disagree, correct, or challenge gently, then offer a better direction
- maybe_so: hold uncertainty and explore without pretending to know

The move is internal. Never display its label or mechanically begin with those phrases.

Relevant voice sparks:
- ${starter}
${anchors.map(line => `- ${line}`).join('\n') || '- none'}

Use sparks as tone and idea seeds, never as mandatory scripts. Historical examples below teach cadence, not facts or authority.

Return exactly one JSON object matching the schema:
- move: yes_and, no_but, or maybe_so
- reply: only the natural response the operator should see

Rules:
- Speak directly to the operator; never say “the user” or describe your tone, process, goal, or response.
- Stay under ${settings.maxWords} visible words.
- Greetings, jokes, hype, stories, and casual chatter may simply remain those things.
- Ask at most one question, only when it genuinely moves the same thread forward.
- Match lowercase, slang, humor, warmth, bluntness, or excitement when appropriate.
- Do not invent memories, motives, diagnoses, hidden meanings, patterns, spiritual signs, or facts.
- Metaphor stays metaphor. The operator keeps final judgment.`;

    return {
      personaId,
      starter,
      input,
      settings,
      messages: [
        { role: 'system', content: system },
        ...fewShotMessages(examples),
        ...samePersonaContext(messages, personaId, settings.contextTurns),
        { role: 'user', content: input }
      ]
    };
  }

  function parseResult(raw, request) {
    const fallback = fallbackReply(request.input, request.starter);
    let parsed;

    try {
      const cleaned = String(raw || '')
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return capWords(fallback, request.settings.maxWords);
    }

    if (!VALID_MOVES.has(parsed.move)) return capWords(fallback, request.settings.maxWords);
    return cleanReply(parsed.reply, fallback, request.settings.maxWords);
  }

  async function complete(messages, onUpdate) {
    if (!baseAI.isReady()) await baseAI.load();

    const request = buildRequest(messages);
    const model = baseAI.getModel();
    if (!model) throw new Error('No Ollama model is selected.');

    try {
      const result = await window.COSMOS_DESKTOP.chat({
        model,
        messages: request.messages,
        format: RESPONSE_SCHEMA,
        temperature: request.settings.temperature,
        topP: request.settings.topP,
        repeatPenalty: request.settings.repeatPenalty,
        maxTokens: request.settings.maxTokens,
        numCtx: request.settings.numCtx
      });

      const text = parseResult(result.text, request);
      if (onUpdate) onUpdate(text);
      return text;
    } catch (error) {
      console.error(error);
      const text = capWords(fallbackReply(request.input, request.starter), request.settings.maxWords);
      if (onUpdate) onUpdate(text);
      return text;
    }
  }

  window.COSMOS_AI = {
    ...baseAI,
    complete,
    getVoiceData: () => voiceData,
    getTuning: tuning
  };
})();
