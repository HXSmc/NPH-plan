import { describe, it, expect } from "vitest";
import { formatMoneyCompact } from "@/lib/money";

// Regression test: formatMoneyCompact rounded values just under 1,000,000 up
// to "1000K" instead of rolling into the M-suffix band. For n in roughly
// [999950, 999999.99], n/1000 = 999.95..999.9999, and .toFixed(1) rounds
// that up to "1000.0" -> stripped to "1000" -> "1000K" was produced, even
// though the >=1_000_000 branch is meant to own that display range (e.g.
// exactly 1,000,000 already formats as "1M"). formatMoneyCompact had no
// call site anywhere in the source tree at the time of this fix, so the bug
// was latent rather than observable on a live page -- this test locks the
// correct boundary behavior before any hero-figure UI wires this formatter
// to at-risk/recovered SAR totals.
describe("formatMoneyCompact M-band boundary", () => {
  it("rolls values in [999950, 999999.99] into the M band instead of '1000K'", () => {
    expect(formatMoneyCompact(999950)).toBe("1M");
    expect(formatMoneyCompact(999975)).toBe("1M");
    expect(formatMoneyCompact(999999)).toBe("1M");
    expect(formatMoneyCompact(999999.99)).toBe("1M");
  });

  it("still formats exactly 1,000,000 as '1M' (unchanged behavior)", () => {
    expect(formatMoneyCompact(1_000_000)).toBe("1M");
  });

  it("still formats just under the rounding boundary as K (unchanged behavior)", () => {
    expect(formatMoneyCompact(999949)).toBe("999.9K");
    expect(formatMoneyCompact(412_900)).toBe("412.9K");
  });

  it("still formats mid-range and large M values correctly (unchanged behavior)", () => {
    expect(formatMoneyCompact(1_834_000)).toBe("1.83M");
    expect(formatMoneyCompact(100_000)).toBe("100K");
  });

  it("accepts numeric-string input at the boundary too", () => {
    expect(formatMoneyCompact("999950")).toBe("1M");
  });
});
