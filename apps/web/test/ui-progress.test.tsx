// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Coverage gap fix: progress.tsx had no dedicated behavior test — only its
// `value` a11y-forwarding fix (see the inline comment in the component) was
// verified by hand at the time. This locks in that fix (aria-valuenow/max
// actually present, not an indeterminate bar) plus the visual indicator's
// value-driven transform.

import { Progress } from "@/components/ui/progress";

describe("Progress — value wiring", () => {
  afterEach(cleanup);

  it("exposes aria-valuenow/aria-valuemax so it is not announced as indeterminate", () => {
    render(<Progress value={42} aria-label="Recovery progress" />);
    const bar = screen.getByRole("progressbar", { name: "Recovery progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("defaults to 0 when no value is given", () => {
    render(<Progress aria-label="Recovery progress" />);
    expect(screen.getByRole("progressbar", { name: "Recovery progress" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("translates the indicator by the complement of the value", () => {
    const { container } = render(<Progress value={30} aria-label="Recovery progress" />);
    const indicator = container.querySelector('[role="progressbar"] > *');
    expect(indicator).toHaveStyle({ transform: "translateX(-70%)" });
  });

  it("fully fills the indicator at value=100", () => {
    const { container } = render(<Progress value={100} aria-label="Recovery progress" />);
    const indicator = container.querySelector('[role="progressbar"] > *');
    expect(indicator).toHaveStyle({ transform: "translateX(-0%)" });
  });
});
