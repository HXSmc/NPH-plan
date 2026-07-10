import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AppSession } from "../lib/session";

// /analytics/audit-report has no extra RBAC gate beyond requireSession
// because rbac.ts's MATRIX never hides "analytics" for any role (mirrors its
// parent Denial Analytics page). This test proves every role reaches it and
// the tenant's own bundle is fetched, not a fixed default.

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
}));
const mockedRequireSession = vi.fn();
vi.mock("@/lib/session", () => ({
  requireSession: (...args: unknown[]) => mockedRequireSession(...args),
}));
const mockedGetAuditReportData = vi.fn();
vi.mock("@/lib/data", () => ({
  getAuditReportData: (...args: unknown[]) => mockedGetAuditReportData(...args),
}));
vi.mock("@/components/modules/audit-report-document", () => ({
  AuditReportDocument: () => null,
}));

function makeSession(overrides: Partial<AppSession> = {}): AppSession {
  return {
    userId: "u1",
    tenantId: "t1",
    tenantName: "Al Salama Dental",
    role: "owner",
    email: "owner@example.com",
    ...overrides,
  };
}

const emptyBundle = {
  money: { recoveredSar: "0.00", atRiskSar: "0.00", deniedCount: 0, claimCount: 0 },
  overallRate: 0,
  byPayer: [],
  pareto: [],
  split: { recoverableSar: "0.00", structuralSar: "0.00", recoverablePct: 0 },
  range: { lowSar: "0.00", highSar: "0.00", modeled: true },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AuditReportPage", () => {
  it.each(["owner", "finance", "rcm", "clinician", "admin"] as const)(
    "renders and fetches this tenant's audit report data for role=%s",
    async (role) => {
      mockedRequireSession.mockResolvedValue(makeSession({ role, tenantId: "tenant-xyz" }));
      mockedGetAuditReportData.mockResolvedValue(emptyBundle);

      const { default: AuditReportPage } = await import(
        "../app/[locale]/(app)/analytics/audit-report/page"
      );
      await expect(
        AuditReportPage({ params: Promise.resolve({ locale: "en" }) }),
      ).resolves.toBeTruthy();

      expect(mockedGetAuditReportData).toHaveBeenCalledWith("tenant-xyz");
    },
  );
});
