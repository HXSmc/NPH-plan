// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import type { AuditReportBundle } from "@/lib/data";

vi.mock("@/components/money/count-up", () => ({
  CountUp: ({ value, className }: { value: number; className?: string }) => (
    <span className={className}>{value}</span>
  ),
}));
vi.mock("@/components/charts/pareto", () => ({
  Pareto: () => <div data-testid="pareto-stub" />,
}));
// window.print is not implemented in jsdom.
Object.defineProperty(window, "print", { value: vi.fn(), writable: true });

import { AuditReportDocument } from "@/components/modules/audit-report-document";

function bundle(overrides: Partial<AuditReportBundle> = {}): AuditReportBundle {
  return {
    money: { recoveredSar: "412900.00", atRiskSar: "1840000.00", deniedCount: 386, claimCount: 1214 },
    overallRate: 0.318,
    byPayer: [
      { key: "p1", label: "Bupa Arabia", claims: 400, denied: 120, rate: 0.3, atRiskSar: "900000.00" },
    ],
    pareto: [
      { code: "MISSING_PREAUTH", label: "Missing pre-authorization", count: 214, sar: "612000.00", cumulativePct: 60 },
    ],
    split: { recoverableSar: "1200000.00", structuralSar: "640000.00", recoverablePct: 0.65 },
    range: { lowSar: "276000.00", highSar: "644000.00", modeled: true },
    ...overrides,
  };
}

function renderDoc(b: AuditReportBundle) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AuditReportDocument tenantName="Al Salama Dental" bundle={b} />
    </NextIntlClientProvider>,
  );
}

describe("AuditReportDocument", () => {
  afterEach(cleanup);

  it("renders the tenant name, denial rate, and leak-by-payer entries", () => {
    renderDoc(bundle());

    expect(screen.getByText("Al Salama Dental")).toBeInTheDocument();
    expect(screen.getByText("31.8%")).toBeInTheDocument();
    expect(screen.getByText("Bupa Arabia")).toBeInTheDocument();
  });

  it("shows a MOCK badge on the projected recovery range only when modeled is true", () => {
    renderDoc(bundle({ range: { lowSar: "100.00", highSar: "200.00", modeled: true } }));
    expect(screen.getByText(enMessages.common.mock)).toBeInTheDocument();

    cleanup();
    renderDoc(bundle({ range: { lowSar: "100.00", highSar: "200.00", modeled: false } }));
    expect(screen.queryByText(enMessages.common.mock)).toBeNull();
  });

  it("prints via window.print() when the print button is clicked", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderDoc(bundle());

    await user.click(screen.getByRole("button", { name: enMessages.report.print }));

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("keeps the tenant name OUT of any print:hidden ancestor, only the print button is screen-only", () => {
    // Regression coverage for a CONFIRMED a11y-review finding: the tenant
    // name used to share a print:hidden wrapper with the print button, so
    // the leave-behind PDF/print output had no clinic identification on it
    // anywhere. Only the interactive print button should be screen-only.
    renderDoc(bundle());

    const tenantName = screen.getByText("Al Salama Dental");
    expect(tenantName.closest(".print\\:hidden")).toBeNull();

    const printButton = screen.getByRole("button", { name: enMessages.report.print });
    expect(printButton.className).toMatch(/print:hidden/);
  });
});
