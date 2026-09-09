const ALL_PERSONAS = globalThis.__COSMOS_PERSONAS__;

if (!ALL_PERSONAS?.astro) {
  throw new Error('COSM.OS Astro persona did not initialize.');
}

// COSM.OS is intentionally a single-voice creative companion now.
const PERSONAS = { astro: ALL_PERSONAS.astro };
const ORDER = ['astro'];

export { PERSONAS, ORDER };

export function getPersona() {
  return PERSONAS.astro;
}

export function isPersona(id) {
  return id === 'astro';
}
