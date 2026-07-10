import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AppSession } from "../lib/session";

// /recovery/owner-report mirrors the parent Recovery Tracking page's RBAC gate
// (rbac.ts's MATRIX: "recovery" is hidden for clinician).

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));
vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
}));
const mockedRequireSession = vi.fn();
vi.mock("@/lib/session", () => ({
  requireSession: (...args: unknown[]) => mockedRequireSession(...args),
}));
const mockedGetOwnerReportData = vi.fn();
vi.mock("@/lib/data", () => ({
  getOwnerReportData: (...args: unknown[]) => mockedGetOwnerReportData(...args),
}));
vi.mock("@/components/modules/owner-report-document", () => ({
  OwnerReportDocument: () => null,
}));

function makeSession(overrides: Partial<AppSession> = {}): AppSession {
  return {
    userId: "u1",
    tenantId: "tenant-xyz",
    tenantName: "Al Salama Dental",
    role: "owner",
    email: "owner@example.com",
    ...overrides,
  };
}

const emptyBundle = {
  recoveredThisMonthSar: "0.00",
  monthLabel: null,
  firstPassRate: 1,
  baselineFirstPassRate: null,
  topPayers: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("OwnerReportPage — server-enforced RBAC gate", () => {
  it("notFound()s and never fetches owner report data for role=clinician", async () => {
    mockedRequireSession.mockResolvedValue(makeSession({ role: "clinician" }));

    const { default: OwnerReportPage } = await import(
      "../app/[locale]/(app)/recovery/owner-report/page"
    );
    await expect(
      OwnerReportPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockedGetOwnerReportData).not.toHaveBeenCalled();
  });

  it.each(["owner", "finance", "rcm", "admin"] as const)(
    "renders and fetches this tenant's owner report data for role=%s",
    async (role) => {
      mockedRequireSession.mockResolvedValue(makeSession({ role }));
      mockedGetOwnerReportData.mockResolvedValue(emptyBundle);

      const { default: OwnerReportPage } = await import(
        "../app/[locale]/(app)/recovery/owner-report/page"
      );
      await expect(
        OwnerReportPage({ params: Promise.resolve({ locale: "en" }) }),
      ).resolves.toBeTruthy();

      expect(mockedGetOwnerReportData).toHaveBeenCalledWith("tenant-xyz");
    },
  );
});
