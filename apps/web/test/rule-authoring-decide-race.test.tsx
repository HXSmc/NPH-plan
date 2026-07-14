// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";
import type { AuthoredRuleRow } from "@/lib/rules-data";

// [GATED money/PHI] Regression test only — do NOT change rule-authoring.tsx's
// decide() logic per policy. This documents (via test.fails, i.e. an
// expected-to-fail red test) the confirmed bug:
//
// decide() gates the Approve/Reject buttons with one shared `acting`
// (string|null) + useTransition's `pending` flag, and its resolving
// callback unconditionally overwrites the single shared `actionErr` state
// for whichever row is now "current" — with no check that the resolving
// promise still belongs to the row the SME is currently looking at. SME
// clicks Approve on rule A (setActing('A'); approveRuleAction('A') starts
// awaiting). Per this file's own comment (mirrored from
// appeals-composer.tsx), React 18's useTransition `pending` flag drops back
// to false once the synchronous dispatch portion finishes — well before the
// awaited RPC settles — so rule B's Approve button is effectively enabled
// again almost immediately. The SME clicks Approve on rule B (setActing('B'),
// a new transition starts). When rule A's decide() promise resolves *later*
// with a gate-block failure (the deterministic re-gate rejected A — e.g. the
// approved library changed since A was drafted), decide()'s callback
// unconditionally calls `setActionErr({gate, error})` — attaching A's
// gate-block reasons onto the shared, always-visible alert region while the
// SME is looking at rule B, whose own approve is still in flight and has
// not failed at all.
//
// This test asserts the CORRECT (bug-free) behavior: a stale row's
// resolution (A, no longer the "current" action once B was dispatched) must
// not overwrite the shared error region while a newer row's (B's) request
// is still in flight. It intentionally fails against the current unfixed
// source (test.fails), per the GATED money/PHI policy — no source change.
//
// This assertion specifically discriminates the clobber bug: unlike gating
// on the Approve button's disabled state (which is *also* broken by the
// separate, unrelated `pending`-flag issue and would stay red even after a
// `prev === rowId`-style fix to setActing/setActionErr), the mis-attributed
// error text only appears because A's resolution is allowed to write to the
// shared `actionErr` state after B has become current. Keying that write on
// "is this resolution still for the currently-dispatched row" (the
// `eob-review-queue.tsx` `prev === rowId` pattern) makes this assertion
// pass — a faithful red/green marker for this specific bug.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

let resolveApproveA:
  | ((v: {
      ok: false;
      gate: { ok: false; stage: string; errors: string[] };
      error: string;
    }) => void)
  | undefined;
vi.mock("@/lib/actions/author-rule", () => ({
  approveRuleAction: vi.fn((id: string) => {
    if (id === "rule-a") {
      return new Promise((resolve) => {
        resolveApproveA = resolve;
      });
    }
    // Rule B's request deliberately never resolves during this test — it
    // models "still in flight" while rule A's stale resolution lands.
    return new Promise(() => {});
  }),
  rejectRuleAction: vi.fn(),
}));

import { RuleAuthoring } from "@/components/modules/rule-authoring";

function makeRow(id: string, name: string): AuthoredRuleRow {
  return {
    id,
    ruleKey: `rk-${id}`,
    name,
    scope: "global",
    payerId: null,
    severity: "medium",
    field: "claim.amount",
    weight: 1,
    version: 1,
    messageEn: "message",
    messageAr: "رسالة",
    rationale: null,
    conditions: { all: [] },
    authoredBy: "sme",
    status: "draft",
    model: null,
    createdBy: null,
    createdAt: "2026-07-01T00:00:00.000Z",
  };
}

function renderPanel(rows: AuthoredRuleRow[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ settings: enMessages.settings }}>
      <RuleAuthoring payers={[]} authoredRules={rows} />
    </NextIntlClientProvider>,
  );
}

describe("RuleAuthoring — decide() shared actionErr clobber across rows (GATED, not fixed)", () => {
  it.fails(
    "does not attach rule A's stale gate-block reasons to the screen once rule B's approve is the current in-flight action",
    async () => {
      // Arrange: two draft rules, A and B. A's approve will resolve to a
      // gate-block failure with reasons specific to A; B's approve stays
      // in flight (unresolved) throughout.
      const rows = [makeRow("rule-a", "Rule A"), makeRow("rule-b", "Rule B")];
      renderPanel(rows);

      const rowItems = screen.getAllByRole("listitem");
      const rowA = within(rowItems[0]);
      const rowB = within(rowItems[1]);

      // Act: approve rule A — its RPC starts awaiting.
      fireEvent.click(rowA.getByRole("button", { name: enMessages.settings.approve }));

      // React 18's useTransition `pending` flag has already dropped back to
      // false by this point (before A's RPC settles — see comment above),
      // so B's Approve button is clickable again: the SME moves on to
      // approve rule B while A is still resolving in the background.
      fireEvent.click(rowB.getByRole("button", { name: enMessages.settings.approve }));

      // Now rule A's stale approve resolves — a gate-block failure with
      // reasons that belong only to rule A.
      await act(async () => {
        resolveApproveA?.({
          ok: false,
          gate: { ok: false, stage: "golden", errors: ["A-only stale gate reason"] },
          error: "gate_blocked",
        });
      });

      // Correct behavior: because rule B's approve is now the current
      // in-flight action (dispatched after A), rule A's superseded
      // resolution must not overwrite the shared error region with its
      // gate-block reasons. The buggy implementation calls
      // `setActionErr({gate, error})` unconditionally on any resolution,
      // regardless of whether a newer action has since been dispatched —
      // so A's stale error appears on screen while B is still pending,
      // and this assertion fails against the unfixed source.
      expect(screen.queryByText("A-only stale gate reason")).not.toBeInTheDocument();
    },
  );
});
