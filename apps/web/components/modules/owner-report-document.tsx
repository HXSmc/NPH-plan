import { useTranslations } from "next-intl";
import type { OwnerReportBundle } from "@/lib/data";
import { formatMoney, formatPct, toNumber } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyFigure } from "@/components/money/money-figure";
import { ReportShell } from "@/components/modules/report-shell";

// A3's one-tap owner report (design-brief §10): "recovered this month, top
// payers recovered from" — a signed-in owner's champion-facing artifact.
// Every figure comes straight off getOwnerReportData's bundle (itself a
// composition of getRecovery/getAnalytics's own rollups, no new money math).
export function OwnerReportDocument({
  tenantName,
  bundle,
}: {
  tenantName: string;
  bundle: OwnerReportBundle;
}) {
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const deltaPct =
    bundle.baselineFirstPassRate != null
      ? (bundle.firstPassRate - bundle.baselineFirstPassRate) * 100
      : undefined;

  return (
    <ReportShell
      title={t("ownerTitle")}
      tenantName={tenantName}
      sourceNote={t("sourceNote", { range: bundle.monthLabel ?? tc("lastMonths", { n: 6 }) })}
    >
      <section className="rounded-xl border border-hairline bg-surface-1 p-6 md:p-8">
        <p className="text-label font-medium uppercase tracking-wide text-muted">
          {t("recoveredThisMonth")}
        </p>
        <div className="mt-2">
          <MoneyFigure
            value={toNumber(bundle.recoveredThisMonthSar)}
            tone="recovered"
            size="hero"
            animate={false}
          />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t("firstPassRate")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="num text-display font-display font-medium">
            {formatPct(bundle.firstPassRate)}
            {deltaPct !== undefined && (
              <span
                className={`ms-2 text-label ${deltaPct >= 0 ? "text-recovered-text" : "text-at-risk-text"}`}
              >
                {deltaPct >= 0 ? "+" : ""}
                {deltaPct.toFixed(1)} {t("percentagePoints")}
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("topPayersRecovered")}</CardTitle>
        </CardHeader>
        <CardContent>
          {bundle.topPayers.length === 0 ? (
            <p className="text-body text-muted">{t("emptyTopPayers")}</p>
          ) : (
            <ul className="flex flex-col">
              {bundle.topPayers.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between border-b border-hairline py-2.5 last:border-0"
                >
                  <span className="text-body font-medium">{p.name}</span>
                  <span className="num text-body text-recovered-text">
                    {formatMoney(p.recoveredSar)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </ReportShell>
  );
}
