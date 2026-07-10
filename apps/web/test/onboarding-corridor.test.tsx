// @vitest-environment jsdom
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import enMessages from "@/messages/en.json";

// A2 first-run corridor (design-brief §9): 4 steps, a persistent progress
// ledger, under-10-minutes-to-first-insight. This drives the real step
// transitions and the step-4 handoff call, with IngestPanel and navigation
// stubbed (its own behavior is covered by ingest-panel-onboarding-callback.test.tsx).

const mockedCompleteOnboarding = vi.fn();
mockedCompleteOnboarding.mockResolvedValue({ ok: true });
vi.mock("@/lib/actions/onboarding", () => ({
  completeOnboarding: (...args: unknown[]) => mockedCompleteOnboarding(...args),
}));

vi.mock("@/components/shell/locale-toggle", () => ({
  LocaleToggle: () => <button type="button">locale-toggle</button>,
}));
vi.mock("@/components/shell/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">theme-toggle</button>,
}));
vi.mock("@/components/money/money-figure", () => ({
  MoneyFigure: ({ value }: { value: number }) => <span>{value}</span>,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...rest }: React.ComponentProps<"a">) => <a {...rest}>{children}</a>,
}));

let ingestSuccessHandler: ((result: unknown) => void) | undefined;
vi.mock("@/components/modules/ingest-panel", () => ({
  IngestPanel: ({ onIngestSuccess }: { onIngestSuccess?: (r: unknown) => void }) => {
    ingestSuccessHandler = onIngestSuccess;
    return <div data-testid="ingest-panel-stub" />;
  },
}));

import { OnboardingCorridor } from "@/components/modules/onboarding-corridor";

const BRANCHES = [
  { id: "b1", name: "Riyadh, Olaya", city: "Riyadh" },
  { id: "b2", name: "Jeddah, Al Rawdah", city: "Jeddah" },
];

function renderCorridor() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <OnboardingCorridor tenantName="Al Salama Dental" branches={BRANCHES} />
    </NextIntlClientProvider>,
  );
}

describe("OnboardingCorridor", () => {
  afterEach(() => {
    cleanup();
    ingestSuccessHandler = undefined;
    mockedCompleteOnboarding.mockClear();
  });

  it("starts on step 1 (locale + theme) with the progress ledger at 1 of 4", () => {
    renderCorridor();

    expect(screen.getByText(enMessages.onboarding.step1Title)).toBeInTheDocument();
    expect(screen.getByText(/1.*4|4.*1/)).toBeInTheDocument();
  });

  it("moves focus to each new step's heading on every transition (a11y regression)", async () => {
    // Without this, a step swap left focus on a now-unmounted button (or,
    // for the automatic 3->4 handoff, nowhere at all) — a keyboard user's
    // next Tab silently restarted from the top of the page.
    const user = userEvent.setup();
    renderCorridor();

    const step1Heading = screen.getByRole("heading", { name: enMessages.onboarding.step1Title });
    expect(step1Heading).toHaveFocus();

    await user.click(screen.getByRole("button", { name: enMessages.onboarding.continue }));
    expect(
      screen.getByRole("heading", { name: enMessages.onboarding.step2Title }),
    ).toHaveFocus();

    await user.click(screen.getByRole("button", { name: enMessages.onboarding.continue }));
    expect(
      screen.getByRole("heading", { name: enMessages.onboarding.step3Title }),
    ).toHaveFocus();

    ingestSuccessHandler?.({
      ok: true,
      fileName: "remit.json",
      claims: 10,
      denials: 3,
      atRiskSar: "1000.00",
      quarantined: [],
    });
    await screen.findByRole("heading", { name: enMessages.onboarding.step4Title });
    expect(
      screen.getByRole("heading", { name: enMessages.onboarding.step4Title }),
    ).toHaveFocus();
  });

  it("announces the step label via a polite live region on every transition", async () => {
    const user = userEvent.setup();
    renderCorridor();

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: enMessages.onboarding.continue }));
    expect(status).toHaveTextContent("2");
  });

  it("advances through steps 2 and 3 on Continue, showing the tenant and branches on step 2", async () => {
    const user = userEvent.setup();
    renderCorridor();

    await user.click(screen.getByRole("button", { name: enMessages.onboarding.continue }));
    expect(screen.getByText(enMessages.onboarding.step2Title)).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.textContent === "Al Salama Dental. One branch is enough to start."),
    ).toBeInTheDocument();
    expect(screen.getByText("Riyadh, Olaya")).toBeInTheDocument();
    expect(screen.getByText("Jeddah, Al Rawdah")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: enMessages.onboarding.continue }));
    expect(screen.getByText(enMessages.onboarding.step3Title)).toBeInTheDocument();
    expect(screen.getByTestId("ingest-panel-stub")).toBeInTheDocument();
  });

  it("on ingest success: calls completeOnboarding and advances to step 4 with the resolved figures", async () => {
    const user = userEvent.setup();
    renderCorridor();
    await user.click(screen.getByRole("button", { name: enMessages.onboarding.continue }));
    await user.click(screen.getByRole("button", { name: enMessages.onboarding.continue }));

    expect(ingestSuccessHandler).toBeTypeOf("function");
    ingestSuccessHandler?.({
      ok: true,
      fileName: "remit.json",
      claims: 1214,
      denials: 386,
      atRiskSar: "1840000.00",
      quarantined: [],
    });

    expect(await screen.findByText(enMessages.onboarding.step4Title)).toBeInTheDocument();
    expect(mockedCompleteOnboarding).toHaveBeenCalledTimes(1);
  });

  it("the step-4 handoff CTA links into Denial Analytics, not an auto-redirect", async () => {
    const user = userEvent.setup();
    renderCorridor();
    await user.click(screen.getByRole("button", { name: enMessages.onboarding.continue }));
    await user.click(screen.getByRole("button", { name: enMessages.onboarding.continue }));
    ingestSuccessHandler?.({
      ok: true,
      fileName: "remit.json",
      claims: 10,
      denials: 3,
      atRiskSar: "1000.00",
      quarantined: [],
    });

    const cta = await screen.findByRole("link", { name: enMessages.onboarding.seeTheLeak });
    expect(cta).toHaveAttribute("href", "/analytics");
  });

  it("surfaces a retry affordance and never gets stuck silent when completeOnboarding rejects", async () => {
    // Regression coverage for a CONFIRMED typescript-review finding: the
    // handoff previously fired completeOnboarding() fire-and-forget with no
    // .catch — a server error left step 4 showing "success" while the
    // baseline was never captured, so isOnboarded() stayed false and a
    // future visit silently bounced back into the corridor with no error
    // ever shown.
    mockedCompleteOnboarding.mockRejectedValueOnce(new Error("db down"));
    const user = userEvent.setup();
    renderCorridor();
    await user.click(screen.getByRole("button", { name: enMessages.onboarding.continue }));
    await user.click(screen.getByRole("button", { name: enMessages.onboarding.continue }));
    ingestSuccessHandler?.({
      ok: true,
      fileName: "remit.json",
      claims: 10,
      denials: 3,
      atRiskSar: "1000.00",
      quarantined: [],
    });

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(enMessages.onboarding.handoffSaveError);
    const retry = screen.getByRole("button", { name: enMessages.common.tryAgain });

    mockedCompleteOnboarding.mockResolvedValueOnce({ ok: true });
    await user.click(retry);

    expect(mockedCompleteOnboarding).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
});
