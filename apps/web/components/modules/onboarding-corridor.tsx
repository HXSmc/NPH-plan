"use client";
import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { completeOnboarding } from "@/lib/actions/onboarding";
import type { IngestResult } from "@/lib/actions/ingest";
import type { BranchRow } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LocaleToggle } from "@/components/shell/locale-toggle";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { MoneyFigure } from "@/components/money/money-figure";
import { IngestPanel } from "@/components/modules/ingest-panel";

const TOTAL_STEPS = 4;
type Step = 1 | 2 | 3 | 4;

// A2 first-run corridor (design-brief §9). A single guided flow, four steps, a
// persistent progress ledger. Step 3 reuses IngestPanel unmodified (its own
// RBAC/rate-limit/parsing behavior is untouched); step 4 fires once, on the
// first successful upload, and captures the EXECUTE B8 recovery baseline —
// after that, isOnboarded() flips true and a return visit to /onboarding
// bounces the tenant straight to their landing module (see the page's own
// gate). The step-4 handoff is a user-actuated CTA rather than an automatic
// redirect (WCAG 3.2.5, no unannounced context change).
export function OnboardingCorridor({
  tenantName,
  branches,
}: {
  tenantName: string;
  branches: BranchRow[];
}) {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const [step, setStep] = React.useState<Step>(1);
  const [selectedBranchIds, setSelectedBranchIds] = React.useState<Set<string>>(
    () => new Set(branches.map((b) => b.id)),
  );
  const [ingestResult, setIngestResult] = React.useState<IngestResult | null>(null);
  const [baselineError, setBaselineError] = React.useState(false);
  const headingRef = React.useRef<HTMLHeadingElement>(null);

  // Moves focus to the new step's heading on every transition, including the
  // automatic step 3 -> 4 handoff (a11y-review finding: without this, each
  // step swap left focus on a now-unmounted button, so a keyboard user's
  // next Tab restarted from the top of the page and a screen-reader user got
  // no announcement that new content replaced the old).
  React.useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  // Awaited and handled, not fire-and-forget: a rejected/failed call must
  // surface to the tenant, not leave step 4 showing "success" while the
  // server never captured the baseline (isOnboarded() would then silently
  // bounce a future visit back into the corridor with no error ever shown —
  // a CONFIRMED typescript-review finding on the original fire-and-forget
  // version of this call).
  const runCompleteOnboarding = React.useCallback(() => {
    setBaselineError(false);
    completeOnboarding()
      .then((result) => setBaselineError(!result.ok))
      .catch(() => setBaselineError(true));
  }, []);

  const handleIngestSuccess = React.useCallback(
    (result: IngestResult) => {
      setIngestResult(result);
      setStep(4);
      runCompleteOnboarding();
    },
    [runCompleteOnboarding],
  );

  const toggleBranch = (id: string) => {
    setSelectedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stepLabel = t("stepOf", { step, total: TOTAL_STEPS });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p role="status" aria-live="polite" className="mb-2 text-label text-muted">
          {stepLabel}
        </p>
        <Progress value={(step / TOTAL_STEPS) * 100} aria-label={stepLabel} />
      </div>

      {step === 1 && (
        <Card className="p-6">
          <h1 ref={headingRef} tabIndex={-1} className="text-h1 font-display font-medium focus:outline-none">
            {t("step1Title")}
          </h1>
          <p className="mt-1 text-body text-muted">{t("step1Lead")}</p>
          <div className="mt-5 flex items-center gap-3">
            <LocaleToggle />
            <ThemeToggle />
          </div>
          <Button className="mt-6" onClick={() => setStep(2)}>
            {t("continue")}
          </Button>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6">
          <h1 ref={headingRef} tabIndex={-1} className="text-h1 font-display font-medium focus:outline-none">
            {t("step2Title")}
          </h1>
          <p className="mt-1 text-body text-muted">
            {tenantName}. {t("step2Lead")}
          </p>
          <ul className="mt-5 flex flex-col gap-3">
            {branches.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between border-b border-hairline pb-3 last:border-0"
              >
                <Label htmlFor={`branch-${b.id}`}>{b.name}</Label>
                <Switch
                  id={`branch-${b.id}`}
                  checked={selectedBranchIds.has(b.id)}
                  onCheckedChange={() => toggleBranch(b.id)}
                />
              </li>
            ))}
          </ul>
          <Button className="mt-6" onClick={() => setStep(3)}>
            {t("continue")}
          </Button>
        </Card>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5">
          <div>
            <h1 ref={headingRef} tabIndex={-1} className="text-h1 font-display font-medium focus:outline-none">
              {t("step3Title")}
            </h1>
            <p className="mt-1 text-body text-muted">{t("step3Lead")}</p>
          </div>
          <IngestPanel onIngestSuccess={handleIngestSuccess} />
          <Card className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-body font-medium">{t("doThisWithMe")}</p>
              <p className="text-label text-muted">{t("doThisWithMeLead")}</p>
            </div>
            {/* Placeholder support inbox pending a real white-glove intake
                queue — a functional mailto keeps the CTA honest rather than a
                dead button (no fake affordance). */}
            <Button variant="secondary" asChild>
              <a
                href={`mailto:support@taweed.sa?subject=${encodeURIComponent(
                  `White-glove import — ${tenantName}`,
                )}`}
              >
                {t("doThisWithMe")}
              </a>
            </Button>
          </Card>
        </div>
      )}

      {step === 4 && ingestResult && (
        <Card className="p-6">
          <h1 ref={headingRef} tabIndex={-1} className="text-h1 font-display font-medium focus:outline-none">
            {t("step4Title")}
          </h1>
          <p className="mt-1 text-body text-muted">
            {t("step4Lead", { claims: ingestResult.claims, denials: ingestResult.denials })}
          </p>
          <div className="mt-5">
            <MoneyFigure value={Number(ingestResult.atRiskSar)} tone="atRisk" size="hero" />
          </div>
          <Button className="mt-6" asChild>
            <Link href="/analytics">{t("seeTheLeak")}</Link>
          </Button>
          {baselineError && (
            <p role="alert" className="mt-4 text-label text-at-risk-text">
              {t("handoffSaveError")}{" "}
              <button
                type="button"
                className="focus-ring underline underline-offset-2"
                onClick={runCompleteOnboarding}
              >
                {tc("tryAgain")}
              </button>
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
