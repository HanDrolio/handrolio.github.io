/* COSM.OS — desktop conversation controller v4
   Qwen uses an internal conversational move — yes_and, no_but, or maybe_so —
   then replies naturally. Starter lines and curated examples guide voice without
   forcing visible forms, labels, or advice into ordinary conversation. */

(() => {
  if (!window.COSMOS_DESKTOP || !window.COSMOS_AI || !window.COSMOS_VOICE_DATA) return;

  const baseAI = window.COSMOS_AI;
  const voiceData = window.COSMOS_VOICE_DATA;

  const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
      move: {
        type: 'string',
        enum: ['yes_and', 'no_but', 'maybe_so']
      },
      reply: { type: 'string' }
    },
    required: ['move', 'reply'],
    additionalProperties: false
  };

  const VALID_MOVES = new Set(['yes_and', 'no_but', 'maybe_so']);
  const META_SLOP = /\b(the user|respond(?:ing)?|response|informative tone|empathetic tone|effective communication|clear actionable guidance|provide a clean answer|underlying desire|how can i assist|feel free|your journey|grow together|do not overclaim|action\s*[—:-]|insight\s*[—:-]|constraint\s*[—:-])\b/i;

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

  function samePersonaContext(messages, personaId, limit = 3) {
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

  function cleanReply(value, fallback) {
    let text = String(value || '')
      .replace(/```(?:json)?/gi, '')
      .replace(/^\s*(yes_and|no_but|maybe_so|yes,?\s*and|no,?\s*but|maybe,?\s*so)\s*[:—-]\s*/i, '')
      .replace(/\[(?:orion|ripple|astro|brix|demon|echo|hermes|flux|cosm(?:os|\.os)|presence)\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text || META_SLOP.test(text)) return fallback;
    if (/^[{[]/.test(text) || /[}\]]$/.test(text)) return fallback;

    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 4);
    text = sentences.join(' ').slice(0, 560).trim();
    if (text.split(/\s+/).length < 2) return fallback;
    return text;
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
    const requestedPersona = personaFromMessages(messages);
    const input = lastUserMessage(messages);
    const routed = route(input, requestedPersona);
    const personaId = routed.persona || requestedPersona;
    const persona = PERSONAS[personaId] || PERSONAS.flux;

    const starters = voiceData.selectStarters(personaId, input, 3, routed.text);
    const starter = starters[0] || routed.text || persona.lines[0];
    const anchors = starters.slice(1);
    const examples = voiceData.selectExamples(personaId, input, 2);

    const system = `You are the ${persona.name} ${persona.glyph} conversational voice inside COSM.OS.

Your goal is simple: have a real conversation with the operator. Follow what they are actually saying, stay curious, and discover a fresh insight together when one naturally appears. Do not turn ordinary chatter into a plan, diagnosis, lesson, or productivity exercise.

Choose one hidden conversational move:
- yes_and: accept or join the direction, then add something alive to it
- no_but: disagree, correct, or challenge gently, then offer a better direction
- maybe_so: hold uncertainty, explore possibilities, and avoid pretending to know

The move is internal. Never display its label and never mechanically begin with “yes, and,” “no, but,” or “maybe, so.”

Relevant voice sparks:
- ${starter}
${anchors.map(line => `- ${line}`).join('\n') || '- none'}

Use those as sparks, not scripts. The examples below show useful conversational motion, not facts you must repeat.

Return exactly one JSON object matching the supplied schema with:
- move: yes_and, no_but, or maybe_so
- reply: the natural response the operator should actually see

Conversation rules:
- Speak directly to the operator; never describe “the user,” your tone, or how you are responding.
- Usually write 1–4 natural sentences under 90 words.
- Greetings, jokes, reactions, hype, and casual chatter can simply be greetings, jokes, reactions, hype, and casual chatter.
- A new insight is a bonus, not a quota. Never invent one.
- Ask at most one question, only when it genuinely keeps the thread moving.
- Match the operator’s energy, including lowercase, humor, slang, or excitement when appropriate.
- Preserve the ${persona.name} flavor without announcing the persona.
- Do not invent memories, motives, diagnoses, hidden meanings, patterns, or facts.
- Historical examples teach cadence, not authority. Metaphor stays metaphor. The operator keeps final judgment.`;

    return {
      personaId,
      starter,
      input,
      messages: [
        { role: 'system', content: system },
        ...fewShotMessages(examples),
        ...samePersonaContext(messages, personaId),
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
      return fallback;
    }

    if (!VALID_MOVES.has(parsed.move)) return fallback;
    return cleanReply(parsed.reply, fallback);
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
        temperature: 0.68,
        topP: 0.92,
        maxTokens: 180
      });

      const text = parseResult(result.text, request);
      if (onUpdate) onUpdate(text);
      return text;
    } catch (error) {
      console.error(error);
      const text = fallbackReply(request.input, request.starter);
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
