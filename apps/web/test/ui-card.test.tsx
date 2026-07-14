// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Coverage gap fix: card.tsx had zero functional tests. Covers the
// composition contract every consumer relies on: CardTitle renders as a
// real heading (h3) so screen-reader users get outline navigation, and
// className overrides merge with (rather than replace) each part's base
// classes via `cn`.

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

describe("Card — composition", () => {
  afterEach(cleanup);

  it("renders title, description, and content in a single composed card", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Denial trend</CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent>SAR 42,000 denied</CardContent>
      </Card>,
    );

    expect(screen.getByRole("heading", { name: "Denial trend", level: 3 })).toBeInTheDocument();
    expect(screen.getByText("Last 6 months")).toBeInTheDocument();
    expect(screen.getByText("SAR 42,000 denied")).toBeInTheDocument();
  });

  it("merges a caller-supplied className with the card's base classes instead of replacing them", () => {
    const { container } = render(<Card className="p-8">content</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card).toHaveClass("p-8");
    // Base structural classes (hairline doctrine) must survive the merge.
    expect(card).toHaveClass("border-hairline");
    expect(card).toHaveClass("bg-surface-1");
  });

  it("merges a caller-supplied className on CardTitle without dropping its base heading styles", () => {
    render(<CardTitle className="text-danger">Alert</CardTitle>);
    const heading = screen.getByRole("heading", { name: "Alert" });
    expect(heading).toHaveClass("text-danger");
    expect(heading).toHaveClass("text-h3");
  });

  it("forwards arbitrary HTML attributes to the underlying element", () => {
    render(<Card data-testid="claim-card">content</Card>);
    expect(screen.getByTestId("claim-card")).toBeInTheDocument();
  });
});
