import { PERSONAS } from './registry.js';

function payload(text) {
  return String(text || '').replace(/[.!?]+$/, '').trim() || String(text || '').trim();
}

function creativeFallback(text) {
  const lines = PERSONAS.astro.lines;
  const seed = Math.max(1, text.length * 31 + (text.charCodeAt(0) || 0));
  return lines[Math.abs(seed) % lines.length].replace(/\{x\}/g, payload(text));
}

export function route(text) {
  return {
    persona: 'astro',
    text: creativeFallback(text),
    override: false
  };
}
