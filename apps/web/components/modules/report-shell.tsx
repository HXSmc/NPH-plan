"use client";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

// A3 shared report chrome (design-brief §9/§10): a single scrollable editorial
// document, print/PDF-ready via the browser's own print-to-PDF (no server-side
// PDF pipeline — @media print in globals.css plus this component's print:hidden
// controls do the work). Used by both the free-audit leave-behind report and
// the one-tap owner report.
export function ReportShell({
  title,
  tenantName,
  sourceNote,
  children,
}: {
  title: string;
  tenantName: string;
  sourceNote: string;
  children: ReactNode;
}) {
  const t = useTranslations("report");
  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-8 print:max-w-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label uppercase tracking-wide text-muted">{t("generatedFor")}</p>
          <p className="text-h2 font-display font-medium">{tenantName}</p>
        </div>
        {/* Only the print BUTTON is screen-only — the tenant identification
            above it must survive onto the printed/PDF page itself (a11y-
            review finding: the previous print:hidden wrapper enclosed both,
            so the leave-behind document had no clinic name on it anywhere). */}
        <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
          <Printer className="size-4" aria-hidden />
          {t("print")}
        </Button>
      </div>

      <header className="border-b border-hairline pb-6">
        <h1 className="text-h1 font-display font-medium">{title}</h1>
        <p className="mt-1 text-label text-muted">{sourceNote}</p>
      </header>

      {children}

      <footer className="mt-4 flex flex-col gap-1 border-t border-hairline pt-4 text-label text-muted">
        <p>{t("trustResidency")}</p>
        <p>{t("trustEncryption")}</p>
        <p>{t("trustDevice")}</p>
        <p>{t("trustIsolation")}</p>
      </footer>
    </article>
  );
}
