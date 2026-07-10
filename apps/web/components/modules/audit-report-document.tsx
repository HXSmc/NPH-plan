import { useTranslations } from "next-intl";
import type { AuditReportBundle } from "@/lib/data";
import { formatMoney, formatPct, toNumber } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyFigure } from "@/components/money/money-figure";
import { RankedBars } from "@/components/charts/ranked-bars";
import { Pareto } from "@/components/charts/pareto";
import { ReportShell } from "@/components/modules/report-shell";

// A3 free-audit leave-behind report (design-brief §9): the exact document
// shown to and left with the owner-physician after a sales/audit visit.
// Reuses the SAME RankedBars/Pareto components the live Denial Analytics
// page renders with (design system consistency, no bespoke chart types) and
// the SAME @taweed/analytics-derived bundle (no re-derived money math).
export function AuditReportDocument({
  tenantName,
  bundle,
}: {
  tenantName: string;
  bundle: AuditReportBundle;
}) {
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const paretoTitleId = "audit-report-pareto-title";

  return (
    <ReportShell
      title={t("auditTitle")}
      tenantName={tenantName}
      sourceNote={t("sourceNote", { range: tc("lastMonths", { n: 6 }) })}
    >
      <section className="rounded-xl border border-hairline bg-surface-1 p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-label font-medium uppercase tracking-wide text-muted">
              {t("denialRateLabel")}
            </p>
            <span className="num-hero text-hero font-medium leading-none text-at-risk">
              {formatPct(bundle.overallRate)}
            </span>
          </div>
          <div className="flex flex-col items-start gap-1">
            <span className="text-label font-medium uppercase tracking-wide text-muted">
              {t("coverLead")}
            </span>
            <MoneyFigure
              value={toNumber(bundle.money.atRiskSar)}
              tone="atRisk"
              size="hero"
              animate={false}
            />
          </div>
        </div>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("leakByPayer")}</CardTitle>
          <Badge variant="atRisk">SAR</Badge>
        </CardHeader>
        <CardContent>
          <RankedBars items={bundle.byPayer} tone="atRisk" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle id={paretoTitleId}>{t("topReasons")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Pareto rows={bundle.pareto} titleId={paretoTitleId} summary={t("topReasons")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("recoverableSplit")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex h-3 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full bg-recovered"
              style={{ width: `${(bundle.split.recoverablePct * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="flex justify-between text-body">
            <span className="text-recovered-text">
              {t("recoverable")}: <span className="num">{formatMoney(bundle.split.recoverableSar)}</span>
            </span>
            <span className="text-muted">
              {t("structural")}: <span className="num">{formatMoney(bundle.split.structuralSar)}</span>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("projectedRecovery")}</CardTitle>
          {bundle.range.modeled && <Badge variant="mock">{tc("mock")}</Badge>}
        </CardHeader>
        <CardContent>
          <p className="num text-display font-display font-medium text-recovered-text">
            {formatMoney(bundle.range.lowSar)} - {formatMoney(bundle.range.highSar)}
          </p>
        </CardContent>
      </Card>
    </ReportShell>
  );
}
