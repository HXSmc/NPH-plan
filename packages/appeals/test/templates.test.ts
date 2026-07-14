import { describe, expect, it } from "vitest";
import { DENIAL_REASON_CODES } from "@taweed/shared";
import type { DenialReasonCode } from "@taweed/shared";
import { generateAppeal } from "../src/index.js";
import type { AppealContext } from "../src/index.js";
import { APPEAL_TEMPLATES, GENERIC_TEMPLATE } from "../src/templates.js";

// APPEAL_TEMPLATES is keyed by the canonical DenialReasonCode union (not a
// bare string), so a mistyped/renamed key fails to COMPILE. This suite
// verifies the runtime map stays in lockstep with the taxonomy it's typed
// against, and that the intentional fallback for out-of-taxonomy codes (a
// code with no template entry) still resolves to GENERIC_TEMPLATE.

function ctxFor(denialCode: string): AppealContext {
  return {
    claimId: "550e8400-e29b-41d4-a716-446655440000",
    nphiesClaimId: "NPHIES-CLM-77",
    sbsCode: "83000-00",
    denialCode,
    denialCategory: "CARC",
    payerName: "Placeholder Insurer",
    providerName: "Al Salama Medical Center",
    memberId: "MBR-100200",
    atRiskSar: "1500.00",
    serviceDate: "2026-03-14",
  };
}

describe("APPEAL_TEMPLATES <-> DenialReasonCode taxonomy", () => {
  it("has a template entry for every canonical DenialReasonCode", () => {
    for (const { code } of DENIAL_REASON_CODES) {
      expect(APPEAL_TEMPLATES[code as DenialReasonCode]).toBeDefined();
    }
  });

  it("has no keys outside the canonical taxonomy (no stray/mistyped entries)", () => {
    const canonical = new Set<string>(DENIAL_REASON_CODES.map((c) => c.code));
    for (const key of Object.keys(APPEAL_TEMPLATES)) {
      expect(canonical.has(key)).toBe(true);
    }
  });

  it("a code with a template entry resolves to that entry's checklist, not the generic one", () => {
    // docChecklist is returned verbatim (no {placeholder} merge), so it's a
    // reliable fingerprint that generateAppeal picked the matching entry.
    for (const { code } of DENIAL_REASON_CODES) {
      const draft = generateAppeal(ctxFor(code));
      const entry = APPEAL_TEMPLATES[code as DenialReasonCode]!;
      expect(draft.docChecklist).toEqual(entry.docChecklist);
      expect(draft.docChecklist).not.toEqual(GENERIC_TEMPLATE.docChecklist);
    }
  });

  it("an out-of-taxonomy code falls back to GENERIC_TEMPLATE (payerSpecific=false)", () => {
    const draft = generateAppeal(ctxFor("TWD-D99-UNKNOWN"));
    expect(draft.payerSpecific).toBe(false);
    expect(draft.docChecklist).toEqual(GENERIC_TEMPLATE.docChecklist);
  });
});
