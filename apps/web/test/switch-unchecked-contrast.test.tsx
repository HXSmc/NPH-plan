// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { Switch } from "@/components/ui/switch";

// Regression test (WCAG 1.4.11 Non-text Contrast finding, /onboarding step 2
// "Confirm your branches", both themes, EN/AR): `Switch`'s unchecked track
// was `bg-surface-3` against the `Card` background (`bg-surface-1`) —
// ~1.18:1 light / ~1.2:1 dark, far under the 3:1 minimum for identifying a
// UI component and its state. The unchecked branch-toggle was functionally
// invisible; only the checked state (solid `bg-accent`, ~5.9:1) had reliable
// contrast. Fixed by swapping the unchecked fill to `bg-faint`
// (`--text-faint`) — an existing token (already carries a light/dark pairing
// in globals.css) that fails the 4.5:1 *text* minimum elsewhere but clears
// the 3:1 *non-text* threshold here.
//
// This mirrors two established patterns from prior findings:
//   - analytics-dark-money-token-contrast.test.ts: parses the real
//     app/globals.css and runs the WCAG contrast formula directly, so it
//     fails again if the token pairing is ever weakened or removed.
//   - badge-accent-dark-contrast.test.tsx: asserts the rendered component
//     actually carries the fixed className, so a future edit to switch.tsx
//     can't silently drop the fix while the CSS math still passes.

const CSS_PATH = path.resolve(__dirname, "../app/globals.css");

function readCssBlock(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`selector ${selector} not found in globals.css`);
  const end = css.indexOf("}", start);
  return css.slice(start, end);
}

function readVar(block: string, name: string): string {
  const match = block.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`${name} not found in block`);
  return match[1];
}

function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

const AA_NON_TEXT_MIN = 3.0;
const WHITE = "#ffffff";

describe("Switch unchecked track (--text-faint) — WCAG 1.4.11 non-text contrast", () => {
  const css = readFileSync(CSS_PATH, "utf-8");
  const root = readCssBlock(css, ":root");
  const dark = readCssBlock(css, ".dark");

  it("meets the 3:1 non-text minimum against --surface-1 in both themes", () => {
    const lightSurface1 = readVar(root, "--surface-1");
    const lightFaint = readVar(root, "--text-faint");
    const darkSurface1 = readVar(dark, "--surface-1");
    const darkFaint = readVar(dark, "--text-faint");

    expect(contrastRatio(lightFaint, lightSurface1)).toBeGreaterThanOrEqual(AA_NON_TEXT_MIN);
    expect(contrastRatio(darkFaint, darkSurface1)).toBeGreaterThanOrEqual(AA_NON_TEXT_MIN);
  });

  it("keeps the white thumb distinguishable (>=3:1) against the unchecked track in both themes", () => {
    const lightFaint = readVar(root, "--text-faint");
    const darkFaint = readVar(dark, "--text-faint");

    expect(contrastRatio(WHITE, lightFaint)).toBeGreaterThanOrEqual(AA_NON_TEXT_MIN);
    expect(contrastRatio(WHITE, darkFaint)).toBeGreaterThanOrEqual(AA_NON_TEXT_MIN);
  });

  it("regression guard: --surface-3 (the original failing pairing) stays under 3:1, proving this is a real fix", () => {
    const lightSurface1 = readVar(root, "--surface-1");
    const lightSurface3 = readVar(root, "--surface-3");
    const darkSurface1 = readVar(dark, "--surface-1");
    const darkSurface3 = readVar(dark, "--surface-3");

    expect(contrastRatio(lightSurface3, lightSurface1)).toBeLessThan(AA_NON_TEXT_MIN);
    expect(contrastRatio(darkSurface3, darkSurface1)).toBeLessThan(AA_NON_TEXT_MIN);
  });
});

describe("Switch component — unchecked track className", () => {
  it("renders the unchecked state via bg-faint, never bg-surface-3", () => {
    render(<Switch checked={false} onCheckedChange={() => {}} aria-label="Test switch" />);
    const el = screen.getByRole("switch");

    expect(el.className).toContain("data-[state=unchecked]:bg-faint");
    expect(el.className).not.toContain("bg-surface-3");
  });
});
