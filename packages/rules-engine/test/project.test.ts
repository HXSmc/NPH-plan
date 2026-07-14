import { describe, it, expect } from "vitest";
import {
  projectClaimFacts,
  claimToFactsReal,
  claimToFactsSynthetic,
  scrub,
  SCRUBBER_RULES,
  type ProjectionClaim,
  type ProjectionLine,
  type ProjectionPatient,
} from "@taweed/rules-engine";

const YEAR = 2026;

// A production-tagged claim carrying REAL signal columns. Money high enough that
// the high-value pre-auth rule (R-D02-preauth-highcost) is in play.
function prodClaim(over: Partial<ProjectionClaim> = {}): ProjectionClaim {
  return {
    id: "claim-real-1",
    payer_id: "PAYER-X",
    total_amount: "5000.00",
    submitted_at: "2026-01-10",
    data_origin: "production",
    preauth_present: true,
    eligibility_verified: true,
    is_duplicate: false,
    has_documentation: true,
    ...over,
  };
}

const LINES: ProjectionLine[] = [
  { sbs_code: "SBS-0001", icd10am_code: "K02.1", qty: 2 },
];
const PATIENT: ProjectionPatient = { birth_year: 1990, gender: "female" };

describe("B5 production guard — synthetic projection is blocked on real data", () => {
  it("claimToFactsSynthetic throws on a production-tagged claim", () => {
    expect(() =>
      claimToFactsSynthetic(prodClaim(), LINES, PATIENT, YEAR),
    ).toThrow(/production/i);
  });

  it("projectClaimFacts routes a production claim to the real projection", () => {
    // Real projection carries the null-when-unknown behavior; the synthetic one
    // never returns a null hasPreAuth. A null preauth on a production claim proves
    // routing went to the real projection.
    const facts = projectClaimFacts(
      prodClaim({ preauth_present: null }),
      LINES,
      PATIENT,
      YEAR,
    );
    expect(facts.hasPreAuth).toBeNull();
  });

  it("projectClaimFacts routes a synthetic claim to the synthetic projection", () => {
    const facts = projectClaimFacts(
      prodClaim({ data_origin: "synthetic", preauth_present: null }),
      LINES,
      PATIENT,
      YEAR,
    );
    // Synthetic projection derives every signal (never null) so the demo shows
    // the full rule range.
    expect(facts.hasPreAuth === null).toBe(false);
  });

  it("fails CLOSED: an untagged/unknown data_origin uses the real projection, never fabricated", () => {
    // A value outside the union (untagged/corrupt) must NOT reach the fabricating
    // projection — it degrades to the real column mapping (null → unevaluable).
    const claim = {
      ...prodClaim({ preauth_present: null }),
      data_origin: "" as ProjectionClaim["data_origin"],
    };
    const facts = projectClaimFacts(claim, LINES, PATIENT, YEAR);
    expect(facts.hasPreAuth).toBeNull();
    expect(() => claimToFactsSynthetic(claim, LINES, PATIENT, YEAR)).toThrow();
  });
});

describe("B5 real projection — unknown signal drives 'unevaluable', not a false pass", () => {
  it("maps present real columns straight through", () => {
    const facts = claimToFactsReal(prodClaim(), LINES, PATIENT, YEAR);
    expect(facts.hasPreAuth).toBe(true);
    expect(facts.policyActive).toBe(true);
    expect(facts.isDuplicate).toBe(false);
    expect(facts.hasDocumentation).toBe(true);
    expect(facts.patientAgeYears).toBe(36); // 2026 - 1990
    expect(facts.patientGender).toBe("female");
    expect(facts.hasDiagnosis).toBe(true); // a line carries an icd10am_code
  });

  it("null preauth_present -> hasPreAuth null -> pre-auth rule is unevaluable", async () => {
    const facts = claimToFactsReal(
      prodClaim({ preauth_present: null }),
      LINES,
      PATIENT,
      YEAR,
    );
    expect(facts.hasPreAuth).toBeNull();
    const result = await scrub(facts, SCRUBBER_RULES);
    expect(result.unevaluable).toContain("R-D02-preauth-highcost");
    // A rule whose fact is absent must never appear as a fired flag.
    expect(result.flags.some((f) => f.ruleId === "R-D02-preauth-highcost")).toBe(
      false,
    );
  });

  it("null eligibility_verified -> policyActive null -> eligibility rule unevaluable", async () => {
    const facts = claimToFactsReal(
      prodClaim({ eligibility_verified: null }),
      LINES,
      PATIENT,
      YEAR,
    );
    expect(facts.policyActive).toBeNull();
    const result = await scrub(facts, SCRUBBER_RULES);
    expect(result.unevaluable).toContain("R-D04-eligibility-gap");
  });

  it("no diagnosis code on any line -> hasDiagnosis false (a real, evaluable signal)", () => {
    const facts = claimToFactsReal(
      prodClaim(),
      [{ sbs_code: "SBS-0001", icd10am_code: null, qty: 1 }],
      PATIENT,
      YEAR,
    );
    expect(facts.hasDiagnosis).toBe(false);
  });

  it("null birth_year -> patientAgeYears null (age rule cannot silently pass)", () => {
    const facts = claimToFactsReal(
      prodClaim(),
      LINES,
      { birth_year: null, gender: "male" },
      YEAR,
    );
    expect(facts.patientAgeYears).toBeNull();
  });

  it("sums qty across multiple lines sharing the same sbs_code instead of overwriting", () => {
    // Arrange: three claim_lines all billing the same SBS code, qty=4 each
    // (12 units billed total — a common split/dated line-item pattern).
    const splitLines: ProjectionLine[] = [
      { sbs_code: "SBS-0002", icd10am_code: "K02.1", qty: 4 },
      { sbs_code: "SBS-0002", icd10am_code: null, qty: 4 },
      { sbs_code: "SBS-0002", icd10am_code: null, qty: 4 },
    ];

    // Act
    const facts = claimToFactsReal(prodClaim(), splitLines, PATIENT, YEAR);

    // Assert: the last line's qty must not clobber the earlier lines' qty.
    expect(facts.lineUnits["SBS-0002"]).toBe(12);
  });

  // GATED (money/PHI, do not fix source logic here — see handoff notes).
  // Confirmed bug: R-INFO-line-count ("unusually high number of service
  // lines") reads the DERIVED `sbsCount` fact, which scrub.ts sets to
  // `facts.sbsCodes.length` (scrub.ts ~line 245). claimToFactsReal already
  // deduplicates sbsCodes via `Array.from(new Set(realCodes(lines)))`
  // (project.ts line 91), so `sbsCount` counts DISTINCT SBS codes, not claim
  // lines. A claim with 12 service lines that all reuse only 3 distinct SBS
  // codes (e.g. the same procedure billed across 12 dated/split lines) ends
  // up with sbsCount === 3, well under the HIGH_LINE_COUNT threshold of 8,
  // so the rule never fires even though the claim genuinely has an
  // unusually high number of service lines that should be reviewed for
  // splitting. This test documents the bug via `it.fails` per policy — do
  // NOT flip it to a normal passing test without a human-approved fix to
  // scrub.ts's line-count fact (it would need a real per-line count, not a
  // dedup'd code count).
  function twelveLinesThreeCodes(): ProjectionLine[] {
    return Array.from({ length: 12 }, (_, i) => ({
      sbs_code: `SBS-000${(i % 3) + 1}`,
      icd10am_code: "K02.1",
      qty: 1,
    }));
  }

  it("setup sanity: 12 lines sharing 3 SBS codes dedup to sbsCodes.length === 3", () => {
    // Ordinary passing assertion (kept OUT of the it.fails body below) so the
    // gated bug test's failure can never be silently caused by this setup
    // guard instead of the actual bug.
    const facts = claimToFactsReal(
      prodClaim(),
      twelveLinesThreeCodes(),
      PATIENT,
      YEAR,
    );
    expect(facts.sbsCodes).toHaveLength(3);
  });

  it.fails(
    "BUG: R-INFO-line-count should fire for 12 lines sharing only 3 distinct SBS codes, but sbsCount undercounts",
    async () => {
      const facts = claimToFactsReal(
        prodClaim(),
        twelveLinesThreeCodes(),
        PATIENT,
        YEAR,
      );
      const result = await scrub(facts, SCRUBBER_RULES);
      // This is the actually-correct expectation for a 12-line claim; it
      // fails today because sbsCount === facts.sbsCodes.length === 3, not 12.
      expect(result.flags.some((f) => f.ruleId === "R-INFO-line-count")).toBe(
        true,
      );
    },
  );
});
