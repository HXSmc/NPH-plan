import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { LLM_MODEL_IDS, mapTaweedModel, MODEL_BY_FEATURE } from "../src/models.js";

describe("model ids", () => {
  it("maps each tier to the exact Anthropic id", () => {
    expect(mapTaweedModel("opus")).toBe("claude-opus-4-8");
    expect(mapTaweedModel("sonnet")).toBe("claude-sonnet-5");
    expect(mapTaweedModel("haiku")).toBe("claude-haiku-4-5");
  });

  it("uses no date suffix on any id (date-suffixed variants 404)", () => {
    for (const id of Object.values(LLM_MODEL_IDS)) {
      expect(id).not.toMatch(/\d{8}$/);
      expect(id).toMatch(/^claude-[a-z0-9-]+$/);
    }
  });
});

// The routing table is documentation, not a mechanism (see models.ts's header
// comment) — features/*.ts still pass the `model:` literal directly. That
// means the table can drift from reality if a feature's model choice changes
// without updating the table. For a feature with exactly ONE runStructured
// call (explain, authorRule; NOT appeal's two calls or extractEob's
// caller-selectable default), this test reads the feature file's actual
// source text and asserts the table's `calls[0].model` literal appears in a
// `model: "<tier>"` request field — cheap drift detection without importing
// the feature module (which pulls in "server-only" + DB types).
function featureSource(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../src/${relativePath}`, import.meta.url)),
    "utf8",
  );
}

describe("MODEL_BY_FEATURE routing table", () => {
  it("documents every AiFeature exactly once", () => {
    expect(Object.keys(MODEL_BY_FEATURE).sort()).toEqual(
      ["appeal", "authorRule", "explain", "extractEob"].sort(),
    );
  });

  it("every entry lists at least one call and a non-empty escalation note", () => {
    for (const entry of Object.values(MODEL_BY_FEATURE)) {
      expect(entry.calls.length).toBeGreaterThan(0);
      expect(entry.escalation.length).toBeGreaterThan(0);
    }
  });

  it.each([
    ["explain", "features/explainFlag.ts"],
    ["authorRule", "features/authorRule.ts"],
  ] as const)(
    "%s's single-call model literal matches its source file",
    (feature, sourceFile) => {
      const entry = MODEL_BY_FEATURE[feature];
      expect(entry.calls).toHaveLength(1);
      const source = featureSource(sourceFile);
      expect(source).toMatch(
        new RegExp(`model:\\s*["']${entry.calls[0]!.model}["']`),
      );
    },
  );

  it("extractEob's default-tier literal matches its source file", () => {
    // extractEob.ts's `model` request field is the variable `model` (caller-
    // selectable), not a literal — assert on its documented default instead:
    // `opts.model ?? "sonnet"`.
    const source = featureSource("features/extractEob.ts");
    expect(source).toMatch(/opts\.model\s*\?\?\s*["']sonnet["']/);
    expect(MODEL_BY_FEATURE.extractEob.calls[0]!.model).toBe("sonnet");
  });
});
