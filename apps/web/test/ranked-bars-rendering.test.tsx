// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Coverage gap fix: pareto.tsx and trend-line.tsx (its recharts siblings)
// each have a dedicated accessibility/behavior test; ranked-bars.tsx had
// none. RankedBars is plain server-renderable markup (no recharts, no
// role=img pattern needed — it's a real <ul> of rows), so this test covers
// its actual behavior instead: sort-independence (it renders in the given
// order), proportional bar width against the max value, formatted money/
// rate per row, and the atRisk vs neutral tone switch.

import { RankedBars, type RankedItem } from "@/components/charts/ranked-bars";

const items: RankedItem[] = [
  { key: "payer-a", label: "Bupa Arabia", rate: 0.42, atRiskSar: "100000", denied: 40, claims: 95 },
  { key: "payer-b", label: "MedGulf", rate: 0.18, atRiskSar: "25000", denied: 10, claims: 55 },
];

describe("RankedBars — rendering", () => {
  afterEach(cleanup);

  it("renders one row per item, in the order given, as a semantic list", () => {
    render(<RankedBars items={items} />);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Bupa Arabia");
    expect(rows[1]).toHaveTextContent("MedGulf");
  });

  it("formats the at-risk SAR value and rate per row using the shared money/pct formatters", () => {
    render(<RankedBars items={items} />);

    // formatMoney: grouped digits, no currency word.
    expect(screen.getByText("100,000")).toBeInTheDocument();
    expect(screen.getByText("25,000")).toBeInTheDocument();
    // formatPct: one decimal.
    expect(screen.getByText("42.0%")).toBeInTheDocument();
    expect(screen.getByText("18.0%")).toBeInTheDocument();
  });

  it("sizes each row's bar proportionally to the largest atRiskSar value in the set", () => {
    const { container } = render(<RankedBars items={items} />);

    const bars = container.querySelectorAll("li > div > div");
    // Row 1 is the max (100000/100000 = 100%); row 2 is 25% of it.
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveStyle({ width: "25%" });
  });

  it("floors a near-zero bar at a minimum visible width instead of collapsing to 0%", () => {
    const tiny: RankedItem[] = [
      { key: "big", label: "Big", rate: 0.5, atRiskSar: "100000", denied: 1, claims: 1 },
      { key: "tiny", label: "Tiny", rate: 0.01, atRiskSar: "1", denied: 1, claims: 1 },
    ];
    const { container } = render(<RankedBars items={tiny} />);

    const bars = container.querySelectorAll("li > div > div");
    // 1/100000 = 0.001% would be visually invisible; the component floors
    // the bar's width at 2% so the row still reads as present.
    expect(bars[1]).toHaveStyle({ width: "2%" });
  });

  it("applies the at-risk tone by default and the neutral tone when requested", () => {
    const { container: atRisk } = render(<RankedBars items={items} />);
    expect(atRisk.querySelector(".bg-at-risk")).not.toBeNull();
    expect(atRisk.querySelector(".text-at-risk-text")).not.toBeNull();
    cleanup();

    const { container: neutral } = render(<RankedBars items={items} tone="neutral" />);
    expect(neutral.querySelector(".bg-money-neutral")).not.toBeNull();
    expect(neutral.querySelector(".text-text")).not.toBeNull();
    expect(neutral.querySelector(".bg-at-risk")).toBeNull();
  });

  it("renders an empty list without throwing when given no items", () => {
    render(<RankedBars items={[]} />);
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
