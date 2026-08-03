/* COSM.OS — desktop voice controller v3
   Wraps the Ollama adapter with relevant starter lines and curated few-shot
   conversations. The raw archive never enters the prompt; only selected examples do. */

(() => {
  if (!window.COSMOS_DESKTOP || !window.COSMOS_AI || !window.COSMOS_VOICE_DATA) return;

  const baseAI = window.COSMOS_AI;
  const voiceData = window.COSMOS_VOICE_DATA;

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
      action: 'Run the smallest testable next step.',
      constraint: 'Do not expand the scope until that step works.'
    },
    ripple: {
      action: 'Slow down one notch and notice what is actually here.',
      constraint: 'The moment does not need a forced conclusion.'
    },
    astro: {
      action: 'Name the feeling beneath the surface statement.',
      constraint: 'Meaning is interpretation, not proof.'
    },
    brix: {
      action: 'Do one physical five-minute version now.',
      constraint: 'Planning does not count as the first rep.'
    },
    demon: {
      action: 'Say the sentence you are avoiding without qualifiers.',
      constraint: 'Challenge the habit, never the person.'
    },
    echo: {
      action: 'Compare this with one concrete earlier example.',
      constraint: 'One callback is not automatically a pattern.'
    },
    hermes: {
      action: 'Give the moment one useful name, then return to the facts.',
      constraint: 'Metaphor is a lens, not literal evidence.'
    },
    flux: {
      action: 'Choose the smallest move that respects feeling and reality.',
      constraint: 'Do not optimize every part of life at once.'
    },
    cosmos: {
      action: 'Select one useful lens and make one grounded move.',
      constraint: 'The operator keeps final authority.'
    }
  };

  function cleanSentence(value, fallback) {
    const text = String(value || '')
      .replace(/```(?:json)?/gi, '')
      .replace(/^\s*(action|insight|constraint)\s*[:—-]\s*/i, '')
      .replace(/\[(?:orion|ripple|astro|brix|demon|echo|hermes|flux|cosm(?:os|\.os)|presence)\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return fallback;
    return text.split(/(?<=[.!?])\s+/)[0].slice(0, 190).trim();
  }

  function personaFromMessages(messages) {
    const system = messages.find(message => message.role === 'system')?.content || '';
    for (const id of ORDER) {
      if (new RegExp(`\\b${PERSONAS[id].name.replace('.', '\\.')}\\b`, 'i').test(system)) return id;
    }
    return 'flux';
  }

  function lastUserMessage(messages) {
    return [...messages].reverse().find(message => message.role === 'user')?.content?.trim() || '';
  }

  function samePersonaContext(messages, personaId, limit = 1) {
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
    let parsed;

    try {
      const cleaned = String(raw || '')
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return fallback;
    }

    const payload = {
      action: cleanSentence(parsed.action, fallback.action),
      insight: cleanSentence(parsed.insight, fallback.insight),
      constraint: cleanSentence(parsed.constraint, fallback.constraint)
    };

    const combined = `${payload.action} ${payload.insight} ${payload.constraint}`;
    const banned = /how can i assist|feel free|your journey|grow together|provide a clean answer|do not overclaim|the user wants a straightforward response|\[(?:ripple|demon|astro|flux|presence)\]/i;
    if (banned.test(combined)) return fallback;

    return payload;
  }

  function renderPayload(payload) {
    return `ACTION — ${payload.action}\nINSIGHT — ${payload.insight}\nCONSTRAINT — ${payload.constraint}`;
  }

  function fewShotMessages(examples) {
    return examples.flatMap(example => [
      { role: 'user', content: example.input },
      {
        role: 'assistant',
        content: JSON.stringify({
          action: example.action,
          insight: example.insight,
          constraint: example.constraint
        })
      }
    ]);
  }

  function buildRequest(messages) {
    const requestedPersona = personaFromMessages(messages);
    const input = lastUserMessage(messages);
    const routed = route(input, requestedPersona);
    const personaId = routed.persona || requestedPersona;
    const persona = PERSONAS[personaId] || PERSONAS.flux;

    const starters = voiceData.selectStarters(personaId, input, 3, routed.text);
    const starter = starters[0] || routed.text || persona.lines[0];
    const anchors = starters.slice(1);
    const examples = voiceData.selectExamples(personaId, input, 2);

    const system = `You are the ${persona.name} ${persona.glyph} language layer inside COSM.OS.

The deterministic kernel selected this starter:
"${starter}"

Other relevant starter lines:
${anchors.map(line => `- ${line}`).join('\n') || '- none'}

Use the starter as the primary idea and the other lines only as tonal support. The examples below show successful COSM.OS conversations selected for relevance.

Return exactly one JSON object matching the supplied schema:
- action: one concrete next move
- insight: one grounded observation
- constraint: one boundary, uncertainty, or missing fact

Rules:
- One sentence per field, each under 24 words.
- Preserve the ${persona.name} voice without writing its name.
- No markdown, labels, signatures, greetings, filler, or follow-up questions inside the fields.
- Do not repeat canned phrases such as "do not overclaim."
- Do not invent memories, diagnoses, motives, patterns, hidden meanings, or facts.
- Historical chat examples teach cadence, not truth or authority.
- Metaphor stays metaphor. The operator keeps final judgment.`;

    return {
      personaId,
      starter,
      messages: [
        { role: 'system', content: system },
        ...fewShotMessages(examples),
        ...samePersonaContext(messages, personaId),
        { role: 'user', content: input }
      ]
    };
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
        temperature: 0.5,
        topP: 0.85,
        maxTokens: 140
      });

      const payload = parsePayload(result.text, request.personaId, request.starter);
      const text = renderPayload(payload);
      if (onUpdate) onUpdate(text);
      return text;
    } catch (error) {
      console.error(error);
      const text = renderPayload(fallbackPayload(request.personaId, request.starter));
      if (onUpdate) onUpdate(text);
      return text;
    }
  }

  window.COSMOS_AI = {
    ...baseAI,
    complete,
    getVoiceData: () => voiceData
  };
})();
