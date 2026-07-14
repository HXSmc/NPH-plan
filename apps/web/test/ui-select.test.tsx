// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Coverage gap fix: select.tsx (a Radix wrapper used across the app, e.g.
// CsvMappingPanel's field overrides) had no dedicated behavior test of its
// own — only an indirect a11y-focus-ring assertion via a consuming module.
// This covers the wrapper's actual job: rendering the placeholder/value,
// opening the listbox, and firing onValueChange when an item is picked.

// Radix Select renders its listbox through a Portal and relies on pointer
// capture APIs jsdom does not implement.
beforeAll(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.releasePointerCapture =
    Element.prototype.releasePointerCapture ?? (() => undefined);
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => undefined);
});

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function renderSelect(onValueChange = vi.fn()) {
  const utils = render(
    <Select onValueChange={onValueChange} defaultValue="a">
      <SelectTrigger aria-label="Payer">
        <SelectValue placeholder="Choose a payer" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Bupa Arabia</SelectItem>
        <SelectItem value="b">MedGulf</SelectItem>
      </SelectContent>
    </Select>,
  );
  return { ...utils, onValueChange };
}

describe("Select — rendering and interaction", () => {
  afterEach(cleanup);

  it("shows the selected item's text on the trigger", () => {
    renderSelect();
    expect(screen.getByRole("combobox", { name: "Payer" })).toHaveTextContent("Bupa Arabia");
  });

  it("shows the placeholder when no value is selected", () => {
    render(
      <Select onValueChange={vi.fn()}>
        <SelectTrigger aria-label="Payer">
          <SelectValue placeholder="Choose a payer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Bupa Arabia</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Payer" })).toHaveTextContent("Choose a payer");
  });

  it("opens the listbox and exposes every item as an accessible option", async () => {
    const user = userEvent.setup();
    renderSelect();

    await user.click(screen.getByRole("combobox", { name: "Payer" }));

    expect(await screen.findByRole("option", { name: "Bupa Arabia" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "MedGulf" })).toBeInTheDocument();
  });

  it("calls onValueChange with the picked item's value when an option is clicked", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderSelect();

    await user.click(screen.getByRole("combobox", { name: "Payer" }));
    const option = await screen.findByRole("option", { name: "MedGulf" });
    await user.click(option);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("disables the trigger when the Select is disabled", () => {
    render(
      <Select onValueChange={vi.fn()} defaultValue="a" disabled>
        <SelectTrigger aria-label="Payer">
          <SelectValue placeholder="Choose a payer" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Bupa Arabia</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByRole("combobox", { name: "Payer" })).toBeDisabled();
  });
});
