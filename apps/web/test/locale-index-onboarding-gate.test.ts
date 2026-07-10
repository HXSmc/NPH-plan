import { describe, it, expect, beforeEach, vi } from "vitest";

// A2 first-run corridor gate at the app entry (apps/web/app/[locale]/page.tsx).
// Must NOT change behavior for a tenant already past onboarding (existing
// landingModule redirect stays exactly as before); a brand-new tenant with no
// captured baseline is redirected into the corridor instead.

vi.mock("next-intl/server", () => ({
  setRequestLocale: vi.fn(),
}));
const mockedRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockedRedirect(url),
}));
const mockedGetSession = vi.fn();
vi.mock("@/lib/session", () => ({
  getSession: (...args: unknown[]) => mockedGetSession(...args),
}));
const mockedIsOnboarded = vi.fn();
vi.mock("@/lib/onboarding", () => ({
  isOnboarded: (...args: unknown[]) => mockedIsOnboarded(...args),
}));
vi.mock("@/components/marketing/landing", () => ({ Landing: () => null }));

async function renderIndex(locale = "en") {
  const { default: LocaleIndex } = await import("../app/[locale]/page");
  return LocaleIndex({ params: Promise.resolve({ locale }) });
}

describe("LocaleIndex onboarding gate (apps/web/app/[locale]/page.tsx)", () => {
  beforeEach(() => {
    vi.resetModules();
    mockedRedirect.mockClear();
    mockedGetSession.mockReset();
    mockedIsOnboarded.mockReset();
  });

  it("has no session: renders the marketing landing, never checks onboarding", async () => {
    mockedGetSession.mockResolvedValue(null);

    await renderIndex();

    expect(mockedIsOnboarded).not.toHaveBeenCalled();
    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it("session, onboarded tenant: redirects to the role's landing module exactly as before", async () => {
    mockedGetSession.mockResolvedValue({
      userId: "u1",
      tenantId: "t1",
      tenantName: "Al Salama Dental",
      role: "rcm",
      email: "rcm@example.com",
    });
    mockedIsOnboarded.mockResolvedValue(true);

    await expect(renderIndex()).rejects.toThrow("NEXT_REDIRECT:/en/analytics");
    expect(mockedIsOnboarded).toHaveBeenCalledWith("t1");
  });

  it("session, NOT onboarded tenant: redirects to the onboarding corridor instead", async () => {
    mockedGetSession.mockResolvedValue({
      userId: "u1",
      tenantId: "t1",
      tenantName: "Al Salama Dental",
      role: "owner",
      email: "owner@example.com",
    });
    mockedIsOnboarded.mockResolvedValue(false);

    await expect(renderIndex()).rejects.toThrow("NEXT_REDIRECT:/en/onboarding");
  });

  it("preserves the request locale in the onboarding redirect", async () => {
    mockedGetSession.mockResolvedValue({
      userId: "u1",
      tenantId: "t1",
      tenantName: "Al Salama Dental",
      role: "owner",
      email: "owner@example.com",
    });
    mockedIsOnboarded.mockResolvedValue(false);

    await expect(renderIndex("ar")).rejects.toThrow("NEXT_REDIRECT:/ar/onboarding");
  });
});
