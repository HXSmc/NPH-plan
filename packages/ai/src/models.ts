// Logical model tiers, mapped to EXACT Anthropic model IDs (no date suffixes —
// claude-api skill: date-suffixed variants 404). The mix follows plan 04 §4.4:
// Haiku for explainers (cheap, deduped), Sonnet for extraction, Opus for
// appeals/rule-authoring. Kept as a swap point so a provider (Bedrock/Vertex/
// self-hosted) can remap ids without touching feature code.

import type { AiFeature } from "./config.js";

export type TaweedModel = "opus" | "sonnet" | "haiku";

export const LLM_MODEL_IDS: Record<TaweedModel, string> = {
  opus: "claude-opus-4-8",
  sonnet: "claude-sonnet-5",
  haiku: "claude-haiku-4-5",
};

export function mapTaweedModel(model: TaweedModel): string {
  return LLM_MODEL_IDS[model];
}

// ---------------------------------------------------------------------------
// MODEL ROUTING POLICY — read this table first. It is the one place a new
// engineer can see, per feature, which model tier(s) are used and any
// escalation policy, instead of hunting through each features/*.ts file for
// its `model: "..."` literal(s). This module only maps TaweedModel -> a
// concrete SDK id (above); the table below documents the ROUTING decision
// each feature makes on top of that map.
//
// This is documentation, not a routing mechanism: feature code still passes
// the TaweedModel literal(s) directly to runStructured (see each entry's
// `source` below) rather than reading through this table at call time — that
// keeps a security-sensitive prompt/model pairing visible and grep-able at
// its call site instead of indirected through a lookup. If a feature's
// model choice changes, update BOTH the literal in its features/*.ts file
// AND this table in the same change; models.test.ts's routing-table test
// below only catches literal drift for single-call features (see its
// comment) — it cannot verify appeal's two-call sequence or extractEob's
// external escalation policy, so keep those two entries honest by hand.
export interface ModelRoutingCall {
  /** the model tier used for this call. */
  model: TaweedModel;
  /** what this call does, in one phrase. */
  role: string;
}

export interface ModelRoutingEntry {
  /** where the `model:` literal(s) actually live — read this file to verify the table. */
  source: string;
  /** every runStructured call this feature makes, in call order. */
  calls: readonly ModelRoutingCall[];
  /** the feature's escalation policy in prose; "none" when it always uses the tier(s) above. */
  escalation: string;
}

export const MODEL_BY_FEATURE: Record<AiFeature, ModelRoutingEntry> = {
  explain: {
    source: "features/explainFlag.ts",
    calls: [
      { model: "haiku", role: "generate the bilingual scrub-flag explanation" },
    ],
    escalation:
      "none — cheap and deduped: the result is cached per (tenant, ruleId, ruleVersion) and only regenerated when the prompt hash (rule text/SYSTEM_PROMPT) changes.",
  },
  authorRule: {
    source: "features/authorRule.ts",
    calls: [
      { model: "opus", role: "draft a structured ScrubRule from the SME's free-text rule description" },
    ],
    escalation: "none — a single Opus call; the draft is UNVALIDATED until it clears the deterministic rules-engine gate.",
  },
  appeal: {
    source: "features/assistAppeal.ts",
    calls: [
      { model: "opus", role: "draft the bilingual (EN/AR) appeal paragraphs" },
      { model: "sonnet", role: "verify/score the draft on factual_consistency, msa_register, completeness" },
    ],
    escalation:
      "none — Opus generates, Sonnet judges the SAME draft (not a retry at a different tier). A verify score below VERIFY_MIN_OVERALL (60) suppresses the suggestion; it does not trigger a re-generation.",
  },
  extractEob: {
    source: "features/extractEob.ts (model choice); adapters/claude-vision-ocr.ts (escalation policy)",
    calls: [
      { model: "sonnet", role: "transcribe the EOB/remittance PDF (default tier; caller-selectable via opts.model)" },
    ],
    escalation:
      "sonnet-first, opus-escalation: extractEob.ts itself takes no escalation decision (opts.model defaults to \"sonnet\"). The sole live caller, adapters/claude-vision-ocr.ts's createClaudeVisionOcrAdapter, retries EXACTLY ONCE at \"opus\" with hiRes=true when the sonnet call fails outright (schema/provider error) or resolves but fails eob-validators.ts's deterministic gate. A failing Opus retry still never throws — it returns a review-required result (escalated:true, confidence:0) rather than escalating further.",
  },
};
