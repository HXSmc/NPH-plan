// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import type { OwnerReportBundle } from "@/lib/data";

vi.mock("@/components/money/count-up", () => ({
  CountUp: ({ value, className }: { value: number; className?: string }) => (
    <span className={className}>{value}</span>
  ),
}));
Object.defineProperty(window, "print", { value: vi.fn(), writable: true });

import { OwnerReportDocument } from "@/components/modules/owner-report-document";

function bundle(overrides: Partial<OwnerReportBundle> = {}): OwnerReportBundle {
  return {
    recoveredThisMonthSar: "18200.00",
    monthLabel: "2026-07",
    firstPassRate: 0.75,
    baselineFirstPassRate: 0.68,
    topPayers: [{ name: "Bupa Arabia", recoveredSar: "12000.00" }],
    ...overrides,
  };
}

function renderDoc(b: OwnerReportBundle) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <OwnerReportDocument tenantName="Al Salama Dental" bundle={b} />
    </NextIntlClientProvider>,
  );
}

describe("OwnerReportDocument", () => {
  afterEach(cleanup);

  it("renders first-pass rate with a positive delta vs the baseline", () => {
    renderDoc(bundle());

    expect(screen.getByText("75.0%")).toBeInTheDocument();
    expect(screen.getByText(/\+7\.0/)).toBeInTheDocument();
  });

  it("omits the delta entirely when no baseline was ever captured", () => {
    renderDoc(bundle({ baselineFirstPassRate: null }));

    expect(screen.queryByText(enMessages.report.percentagePoints)).toBeNull();
  });

  it("lists top payers by recovered SAR", () => {
    renderDoc(bundle());

    expect(screen.getByText("Bupa Arabia")).toBeInTheDocument();
  });

  it("shows the empty-state message when nothing has recovered yet", () => {
    renderDoc(bundle({ topPayers: [] }));

    expect(screen.getByText(enMessages.report.emptyTopPayers)).toBeInTheDocument();
  });
});
