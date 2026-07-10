// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { CountUp } from "@/components/money/count-up";

// A3 report documents need the final value at first paint, not mid-animation
// (a11y-review finding: window.print() could fire before the count-up/
// IntersectionObserver settles, freezing a wrong figure into the printed
// artifact). `animate={false}` renders the final formatted value immediately,
// no observer, no requestAnimationFrame loop.
describe("CountUp — animate=false renders the final value with no animation", () => {
  afterEach(cleanup);

  it("shows the final formatted value immediately, not 0", () => {
    render(<CountUp value={1840000} animate={false} />);

    expect(screen.getByText("1,840,000")).toBeInTheDocument();
  });
});
