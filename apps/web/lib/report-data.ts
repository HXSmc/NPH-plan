import type { ReasonRow, RecoverabilityRow } from "@taweed/analytics";
import type { AppealPipelineRow } from "./data";

export interface RecoverableSplit {
  recoverableSar: string;
  structuralSar: string;
  /** Fraction of total pareto SAR classified recoverable, in [0,1]. */
  recoverablePct: number;
}

/**
 * A3 free-audit report's "recoverable versus structural" split (design-brief
 * §9). A denial reason counts as recoverable if the tenant has EVER won an
 * appeal against it (any payer, per @taweed/analytics `recoverability`); a
 * reason with no historical win — including no data at all — is structural,
 * the honest default absent evidence it can be overturned.
 */
export function recoverableSplit(
  pareto: ReasonRow[],
  recoverability: RecoverabilityRow[],
): RecoverableSplit {
  const recoverableCodes = new Set(
    recoverability.filter((r) => r.won > 0).map((r) => r.reasonCode),
  );
  let recoverable = 0;
  let structural = 0;
  for (const row of pareto) {
    const sar = Number(row.sar);
    if (recoverableCodes.has(row.code)) recoverable += sar;
    else structural += sar;
  }
  const total = recoverable + structural;
  return {
    recoverableSar: recoverable.toFixed(2),
    structuralSar: structural.toFixed(2),
    recoverablePct: total > 0 ? recoverable / total : 0,
  };
}

export interface ProjectedRecoveryRange {
  lowSar: string;
  highSar: string;
  /** True when no resolved appeal exists yet and the range is an industry-
   * modeled estimate rather than derived from this tenant's own outcomes. */
  modeled: boolean;
}

// Conservative default band for a tenant with no resolved appeals yet — an
// industry-plausible estimate, never presented as "from your data" (the
// report always sets `modeled: true` alongside it so the UI can badge it).
const DEFAULT_LOW_RATE = 0.15;
const DEFAULT_HIGH_RATE = 0.35;
const HISTORICAL_BAND = 0.1;

/** A3's "projected recovery range" (design-brief §10). */
export function projectedRecoveryRange(
  atRiskSar: string,
  recoverability: RecoverabilityRow[],
): ProjectedRecoveryRange {
  const atRisk = Number(atRiskSar);
  const totalResolved = recoverability.reduce((a, r) => a + r.resolved, 0);
  const totalWon = recoverability.reduce((a, r) => a + r.won, 0);

  if (totalResolved > 0) {
    const rate = totalWon / totalResolved;
    const low = Math.max(0, rate - HISTORICAL_BAND);
    const high = Math.min(1, rate + HISTORICAL_BAND);
    return {
      lowSar: (atRisk * low).toFixed(2),
      highSar: (atRisk * high).toFixed(2),
      modeled: false,
    };
  }

  return {
    lowSar: (atRisk * DEFAULT_LOW_RATE).toFixed(2),
    highSar: (atRisk * DEFAULT_HIGH_RATE).toFixed(2),
    modeled: true,
  };
}

export interface TopPayerRow {
  name: string;
  recoveredSar: string;
}

/**
 * A3 owner report's "top payers recovered from" (design-brief §10). Pure
 * aggregation over Recovery Tracking's own pipeline rows (`getRecovery`) — no
 * new query, no re-derived money math.
 */
export function aggregateTopPayers(
  rows: AppealPipelineRow[],
  limit = 3,
): TopPayerRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.recoveredSar) continue;
    totals.set(row.payerName, (totals.get(row.payerName) ?? 0) + Number(row.recoveredSar));
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, sar]) => ({ name, recoveredSar: sar.toFixed(2) }));
}
