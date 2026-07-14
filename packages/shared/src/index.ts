// This barrel is re-exported into client bundles (e.g. apps/web's appeals
// composer imports `levenshtein` from here) — every export must stay
// isomorphic. No `node:*` imports anywhere under packages/shared/src; this
// is enforced by the scoped `no-restricted-imports` rule in eslint.config.mjs.
export * from "./denial-codes.js";
export * from "./edit-distance.js";
export * from "./glossary.js";
export * from "./id.js";
export * from "./rate-limit.js";
export * from "./types.js";
