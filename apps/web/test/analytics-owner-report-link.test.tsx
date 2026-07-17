// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Discoverability gap (rbac.landingModule): rcm lands on Analytics by
// default, and Analytics' only report CTA pointed at /analytics/audit-report
// — the owner report at /recovery/owner-report was only reachable from an
// Overview card rcm never lands on. This adds a second header action linking
// straight to it, alongside the existing audit-report link.

vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn(async () => ((key: string) => key) as unknown),
  setRequestLocale: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  requireSession: vi.fn(async () => ({
    userId: "u1",
    tenantId: "t1",
    tenantName: "Acme Health",
    role: "rcm",
    email: "rcm@acme.test",
  })),
}));
vi.mock("@/lib/data", () => ({
  getAnalytics: vi.fn(async () => ({
    money: { recoveredSar: "0.00", atRiskSar: "0.00", deniedCount: 0, claimCount: 0 },
    overallRate: 0,
    byPayer: [],
    byBranch: [],
    pareto: [],
    trend: [],
  })),
  getBranches: vi.fn(async () => []),
  resolveBranchId: vi.fn(() => undefined),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...rest }: React.ComponentProps<"a">) => <a {...rest}>{children}</a>,
}));
// CountUp reads IntersectionObserver/matchMedia, neither available in jsdom —
// stub it to its settled value, same pattern used by other money-* tests.
vi.mock("@/components/money/count-up", () => ({
  CountUp: ({ value, className }: { value: number; className?: string }) => (
    <span className={className}>{value}</span>
  ),
}));
// recharts' ResponsiveContainer (used by the trend/Pareto charts on this
// page) needs ResizeObserver, which jsdom does not implement.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);
// useReducedMotion (read by the trend chart) needs matchMedia, also absent
// in jsdom — any stable stub is fine, these tests don't assert on motion.
window.matchMedia = vi.fn().mockReturnValue({
  matches: false,
  media: "(prefers-reduced-motion: reduce)",
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}) as unknown as typeof window.matchMedia;

import AnalyticsPage from "../app/[locale]/(app)/analytics/page";

describe("Analytics page — owner report header link", () => {
  it("links to /recovery/owner-report alongside the audit-report CTA", async () => {
    // Arrange + Act: server component — render its resolved element tree.
    render(
      await AnalyticsPage({
        params: Promise.resolve({ locale: "en" }),
        searchParams: Promise.resolve({}),
      }),
    );

    // Assert: both header report links are present and distinct.
    const ownerReportLink = screen.getByRole("link", { name: "buildOwnerReport" });
    expect(ownerReportLink).toHaveAttribute("href", "/recovery/owner-report");

    const auditReportLink = screen.getByRole("link", { name: "buildAuditReport" });
    expect(auditReportLink).toHaveAttribute("href", "/analytics/audit-report");
  });
});
