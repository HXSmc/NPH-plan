import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AppSession } from "../lib/session";

// The /onboarding route itself is gated twice: requireSession() (must be
// authenticated) and, if the tenant already has a baseline, bounced straight
// to their landing module — a direct nav to /onboarding after activation must
// never re-run the corridor.

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
}));
const mockedRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockedRedirect(url),
}));
const mockedRequireSession = vi.fn();
vi.mock("@/lib/session", () => ({
  requireSession: (...args: unknown[]) => mockedRequireSession(...args),
}));
const mockedIsOnboarded = vi.fn();
vi.mock("@/lib/onboarding", () => ({
  isOnboarded: (...args: unknown[]) => mockedIsOnboarded(...args),
}));
const mockedGetBranches = vi.fn();
vi.mock("@/lib/data", () => ({
  getBranches: (...args: unknown[]) => mockedGetBranches(...args),
}));
vi.mock("@/components/modules/onboarding-corridor", () => ({
  OnboardingCorridor: () => null,
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

describe("OnboardingPage (apps/web/app/[locale]/(onboarding)/onboarding/page.tsx)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("not onboarded: renders the corridor with the tenant's branches", async () => {
    mockedRequireSession.mockResolvedValue(makeSession());
    mockedIsOnboarded.mockResolvedValue(false);
    mockedGetBranches.mockResolvedValue([{ id: "b1", name: "Riyadh, Olaya", city: "Riyadh" }]);

    const { default: OnboardingPage } = await import(
      "../app/[locale]/(onboarding)/onboarding/page"
    );
    await OnboardingPage({ params: Promise.resolve({ locale: "en" }) });

    expect(mockedGetBranches).toHaveBeenCalledWith("t1");
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it("already onboarded: bounces to the role's landing module without rendering the corridor", async () => {
    mockedRequireSession.mockResolvedValue(makeSession({ role: "rcm" }));
    mockedIsOnboarded.mockResolvedValue(true);

    const { default: OnboardingPage } = await import(
      "../app/[locale]/(onboarding)/onboarding/page"
    );
    await expect(
      OnboardingPage({ params: Promise.resolve({ locale: "en" }) }),
    ).rejects.toThrow("NEXT_REDIRECT:/en/analytics");

    expect(mockedGetBranches).not.toHaveBeenCalled();
  });
});
