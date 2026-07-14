// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { EobExtraction } from "@taweed/ai";
import type { EobReviewRow } from "@/lib/eob-review-data";
import enMessages from "@/messages/en.json";

// GATED regression test (bug audit finding — money/PHI path, see repo policy:
// gated bugs get a red test.fails() capturing the scenario, never a source fix
// applied automatically).
//
// eob-review-queue.tsx tracks in-flight approve/reject state in ONE shared
// `action` object keyed loosely by rowId (not a per-row map). Nothing stops a
// reviewer from switching to a different row and acting on it while a prior
// row's approve/reject request is still in flight — the "Review" button is
// only disabled by `!row.extraction`, never by `action.status`. When the
// first row's request later resolves, its callback unconditionally overwrites
// the shared `action` state (setAction({status:'idle'}) on success, or
// setAction({status:'error', rowId, ...}) on failure) — clobbering whatever
// the second row's own in-flight tracking had set. Concretely this makes the
// second row's Approve/Reject buttons (which read `disabled={pending}` off
// that same shared state via `isPending`) become enabled again while the
// second row's request is genuinely still in flight, letting the reviewer
// fire a duplicate approveEobExtractionAction call for the same PHI-adjacent
// EOB row.
//
// This test is intentionally `it.fails()`: it documents the bug without
// modifying eob-review-queue.tsx's money/PHI approve/reject logic.

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const resolvers: Record<string, (v: { ok: true }) => void> = {};
vi.mock("@/lib/actions/eob-review", () => ({
  approveEobExtractionAction: vi.fn(
    (rowId: string) =>
      new Promise((resolve) => {
        resolvers[rowId] = resolve;
      }),
  ),
  rejectEobExtractionAction: vi.fn(),
}));

import { EobReviewQueue } from "@/components/modules/eob-review-queue";

function makeExtraction(payerName: string): EobExtraction {
  return {
    payerName,
    payerNphiesId: "NPHIES-1",
    remittanceDate: "2026-07-01",
    remittanceTotalPaidHalalas: 10_000,
    overallConfidence: 0.9,
    claims: [
      {
        claimId: "claim-1",
        nphiesClaimId: null,
        patientRef: null,
        serviceDate: null,
        confidence: 0.9,
        totalBilledHalalas: 10_000,
        totalPaidHalalas: 10_000,
        totalRejectedHalalas: 0,
        totalAdjustmentHalalas: 0,
        lines: [
          {
            claimLineRef: "1",
            sbsCode: null,
            icd10amCode: null,
            billedHalalas: 10_000,
            paidHalalas: 10_000,
            patientShareHalalas: 0,
            rejectedHalalas: 0,
            adjustmentHalalas: 0,
            denialCode: null,
            confidence: 0.9,
          },
        ],
      },
    ],
  };
}

function makeRow(id: string, filename: string): EobReviewRow {
  return {
    id,
    sourceFilename: filename,
    status: "pending_review",
    extraction: makeExtraction(`Payer for ${filename}`),
    validatorReport: null,
    model: "sonnet",
    escalated: false,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
  };
}

function renderQueue(rows: EobReviewRow[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ reviewQueue: enMessages.reviewQueue }}>
      <EobReviewQueue rows={rows} />
    </NextIntlClientProvider>,
  );
}

describe("EobReviewQueue — shared action-state clobber across rows (GATED, money/PHI)", () => {
  it.fails(
    "keeps row2's Approve button disabled while row2's own approve request is still in flight, even after row1's earlier request resolves in the background",
    async () => {
      // Arrange: two pending rows.
      const rows = [makeRow("row1", "remit-1.pdf"), makeRow("row2", "remit-2.pdf")];
      renderQueue(rows);

      const reviewButtons = screen.getAllByRole("button", { name: enMessages.reviewQueue.review });

      // Reviewer opens row1 and clicks Approve — row1's request hangs.
      fireEvent.click(reviewButtons[0]);
      let approveButton = await screen.findByRole("button", { name: enMessages.reviewQueue.approve });
      fireEvent.click(approveButton);
      expect(resolvers.row1).toBeDefined();

      // Before row1 resolves, the reviewer switches to row2 (allowed: the
      // "Review" button is only gated by `!row.extraction`) and clicks
      // Approve there too — row2's request also hangs, tracked by the SAME
      // shared `action` state as row1's.
      fireEvent.click(reviewButtons[1]);
      approveButton = await screen.findByRole("button", { name: enMessages.reviewQueue.approve });
      fireEvent.click(approveButton);
      expect(resolvers.row2).toBeDefined();

      // Act: row1's approve now resolves successfully in the background,
      // while row2's approve is still genuinely in flight.
      resolvers.row1!({ ok: true });
      await Promise.resolve();
      await Promise.resolve();

      // Assert (documents correct behavior, currently failing): row2's own
      // request is still pending, so its Approve button must still be
      // disabled. The shared-state bug instead re-enables it — row1's
      // resolution clobbers row2's pending tracking — which would let the
      // reviewer fire a second, duplicate approveEobExtractionAction call for
      // row2 while the first is still processing.
      const stillPendingApproveButton = screen.getByRole("button", {
        name: enMessages.reviewQueue.approve,
      });
      expect(stillPendingApproveButton).toBeDisabled();
    },
  );
});
