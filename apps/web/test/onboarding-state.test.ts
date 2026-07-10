import { describe, it, expect, beforeEach, vi } from "vitest";

// A2 first-run corridor gate: a tenant is "onboarded" once it has captured its
// recovery baseline (EXECUTE B8, `recovery_baselines`). That capture happens
// exactly once, at the end of the corridor's upload step, so its presence is
// an honest signal — no new migration/flag needed. A tenant with a baseline
// row must be treated as onboarded even if it later has zero claims again.

const mockedGetLatestBaseline = vi.fn();
vi.mock("@taweed/analytics", () => ({
  getLatestBaseline: (...args: unknown[]) => mockedGetLatestBaseline(...args),
}));

const mockedWithSession = vi.fn();
const stubDb = {};
vi.mock("@/lib/db", () => ({
  withSession: (...args: unknown[]) => mockedWithSession(...args),
}));

describe("isOnboarded (apps/web/lib/onboarding.ts)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedGetLatestBaseline.mockReset();
    mockedWithSession.mockReset();
    mockedWithSession.mockImplementation(
      async (_tenantId: string, fn: (db: unknown) => unknown) => fn(stubDb),
    );
  });

  it("returns false when no baseline has been captured yet", async () => {
    mockedGetLatestBaseline.mockResolvedValue(null);
    const { isOnboarded } = await import("../lib/onboarding");

    expect(await isOnboarded("tenant-a")).toBe(false);
    expect(mockedWithSession).toHaveBeenCalledWith("tenant-a", expect.any(Function));
  });

  it("returns true once a baseline exists, regardless of its values", async () => {
    mockedGetLatestBaseline.mockResolvedValue({
      id: "b1",
      capturedAt: "2026-01-01T00:00:00Z",
      atRiskSar: "0.00",
      deniedCount: 0,
      claimCount: 0,
      note: null,
    });
    const { isOnboarded } = await import("../lib/onboarding");

    expect(await isOnboarded("tenant-a")).toBe(true);
  });

  it("scopes the check to the given tenant via withSession (RLS-bound)", async () => {
    mockedGetLatestBaseline.mockResolvedValue(null);
    const { isOnboarded } = await import("../lib/onboarding");

    await isOnboarded("tenant-b");

    expect(mockedWithSession).toHaveBeenCalledTimes(1);
    expect(mockedWithSession).toHaveBeenCalledWith("tenant-b", expect.any(Function));
  });
});
