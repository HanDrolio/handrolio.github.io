const PERSONAS = globalThis.__COSMOS_PERSONAS__;
const ORDER = globalThis.__COSMOS_ORDER__;

if (!PERSONAS || !Array.isArray(ORDER)) {
  throw new Error('COSM.OS persona registry did not initialize.');
}

export { PERSONAS, ORDER };

export function getPersona(id) {
  return PERSONAS[id] || PERSONAS.flux;
}

export function isPersona(id) {
  return Boolean(id && PERSONAS[id]);
}
