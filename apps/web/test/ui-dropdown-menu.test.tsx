// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Coverage gap fix: dropdown-menu.tsx had zero functional tests. Covers the
// wrapper's actual job: trigger opens the menu, items/labels/separator
// render with the right roles, and clicking an item fires its onSelect and
// closes the menu.

// Radix's menu positioning relies on pointer capture / measurement APIs
// jsdom does not implement.
beforeAll(() => {
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.releasePointerCapture =
    Element.prototype.releasePointerCapture ?? (() => undefined);
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => undefined);
});

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function renderMenu(onSelectExport = vi.fn(), onSelectDelete = vi.fn()) {
  const utils = render(
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Claim actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onSelectExport}>Export</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSelectDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  return { ...utils, onSelectExport, onSelectDelete };
}

describe("DropdownMenu — rendering and interaction", () => {
  afterEach(cleanup);

  it("does not render menu items until the trigger is activated", () => {
    renderMenu();
    expect(screen.queryByRole("menuitem", { name: "Export" })).not.toBeInTheDocument();
  });

  it("opens the menu and renders the label, items, and separator on trigger click", async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole("button", { name: "Actions" }));

    expect(await screen.findByText("Claim actions")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("fires the item's onSelect and closes the menu when an item is clicked", async () => {
    const user = userEvent.setup();
    const { onSelectExport } = renderMenu();

    await user.click(screen.getByRole("button", { name: "Actions" }));
    const exportItem = await screen.findByRole("menuitem", { name: "Export" });
    await user.click(exportItem);

    expect(onSelectExport).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menuitem", { name: "Export" })).not.toBeInTheDocument();
  });
});
