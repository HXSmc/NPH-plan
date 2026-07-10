import { describe, it, expect } from "vitest";
import {
  recoverableSplit,
  projectedRecoveryRange,
  aggregateTopPayers,
} from "../lib/report-data";
import type { ReasonRow, RecoverabilityRow } from "@taweed/analytics";
import type { AppealPipelineRow } from "../lib/data";

// A3 free-audit report's "recoverable versus structural" split (design-brief
// §9) and "projected recovery range" (§10). Both are pure derivations over
// existing @taweed/analytics rollups (reasonPareto + recoverability) — no new
// money math, no DB access.

function reason(code: string, sar: string): ReasonRow {
  return { code, label: code, count: 1, sar, cumulativePct: 0 };
}

function row(
  reasonCode: string,
  won: number,
  resolved: number,
  payerId = "payer-1",
): RecoverabilityRow {
  return { payerId, reasonCode, won, resolved, recoveryRate: won / resolved };
}

describe("recoverableSplit", () => {
  it("sums SAR into recoverable when a reason has ANY historical win, structural otherwise", () => {
    const pareto = [reason("MISSING_PREAUTH", "1000.00"), reason("AGE_MISMATCH", "500.00")];
    const recoverability = [row("MISSING_PREAUTH", 2, 5)]; // recoveryRate 0.4 > 0
    // AGE_MISMATCH has no recoverability row at all -> structural.

    const result = recoverableSplit(pareto, recoverability);

    expect(result.recoverableSar).toBe("1000.00");
    expect(result.structuralSar).toBe("500.00");
    expect(result.recoverablePct).toBeCloseTo(1000 / 1500);
  });

  it("treats a reason with zero historical wins as structural, not recoverable", () => {
    const pareto = [reason("NEVER_WON", "300.00")];
    const recoverability = [row("NEVER_WON", 0, 4)]; // recoveryRate 0

    const result = recoverableSplit(pareto, recoverability);

    expect(result.recoverableSar).toBe("0.00");
    expect(result.structuralSar).toBe("300.00");
  });

  it("returns 0 recoverablePct with no pareto rows (brand-new tenant), never divides by zero", () => {
    const result = recoverableSplit([], []);

    expect(result.recoverableSar).toBe("0.00");
    expect(result.structuralSar).toBe("0.00");
    expect(result.recoverablePct).toBe(0);
  });
});

describe("projectedRecoveryRange", () => {
  it("bands the historical win rate +/-10pp when resolved appeals exist (modeled: false)", () => {
    // Overall: 3 won / 10 resolved = 0.3 rate -> [0.2, 0.4] * atRisk
    const recoverability = [row("A", 2, 6), row("B", 1, 4)];

    const result = projectedRecoveryRange("100000.00", recoverability);

    expect(result.modeled).toBe(false);
    expect(result.lowSar).toBe("20000.00");
    expect(result.highSar).toBe("40000.00");
  });

  it("clamps the band to [0, 1] at the extremes", () => {
    const allWon = [row("A", 10, 10)]; // rate 1.0 -> high would be 1.1, clamp to 1.0
    const result = projectedRecoveryRange("1000.00", allWon);

    expect(result.highSar).toBe("1000.00");
  });

  it("falls back to a conservative modeled range (15 to 35 percent) with no resolved appeals yet", () => {
    const result = projectedRecoveryRange("200000.00", []);

    expect(result.modeled).toBe(true);
    expect(result.lowSar).toBe("30000.00");
    expect(result.highSar).toBe("70000.00");
  });
});

function pipelineRow(payerName: string, recoveredSar: string | null): AppealPipelineRow {
  return {
    appealId: `appeal-${Math.random()}`,
    claimId: "claim-1",
    nphiesClaimId: null,
    payerName,
    status: recoveredSar ? "won" : "submitted",
    appealedSar: "100.00",
    recoveredSar,
    daysOpen: 5,
  };
}

describe("aggregateTopPayers", () => {
  it("sums recovered SAR per payer, descending, ignoring rows with no recovery yet", () => {
    const rows = [
      pipelineRow("Bupa Arabia", "1000.00"),
      pipelineRow("Tawuniya", "3000.00"),
      pipelineRow("Bupa Arabia", "500.00"),
      pipelineRow("MedGulf", null),
    ];

    const result = aggregateTopPayers(rows);

    expect(result).toEqual([
      { name: "Tawuniya", recoveredSar: "3000.00" },
      { name: "Bupa Arabia", recoveredSar: "1500.00" },
    ]);
  });

  it("caps at the given limit (default 3)", () => {
    const rows = [
      pipelineRow("A", "400.00"),
      pipelineRow("B", "300.00"),
      pipelineRow("C", "200.00"),
      pipelineRow("D", "100.00"),
    ];

    expect(aggregateTopPayers(rows)).toHaveLength(3);
    expect(aggregateTopPayers(rows, 2)).toHaveLength(2);
  });

  it("returns an empty array when nothing has recovered yet", () => {
    expect(aggregateTopPayers([pipelineRow("A", null)])).toEqual([]);
  });
});
