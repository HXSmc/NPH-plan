import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/lib/session";
import { getBranches, getMoneyScope } from "@/lib/data";
import { toNumber } from "@/lib/money";
import { Rail } from "@/components/shell/rail";
import { CommandBar } from "@/components/shell/command-bar";
import { SkipLink } from "@/components/shell/skip-link";

// Every authenticated surface is per-request dynamic: the data is tenant-scoped
// and session-derived, so it must NEVER be statically prerendered and shared
// across tenants. This is a hard tenant-isolation requirement.
export const dynamic = "force-dynamic";

// The authenticated shell. Auth is enforced here (redirect to login when no
// verified session), and tenant_id is derived from that session for every read.
export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireSession(locale);
  const t = await getTranslations("common");

  const [money, branches] = await Promise.all([
    getMoneyScope(session.tenantId),
    getBranches(session.tenantId),
  ]);

  const scopeLabel = `${session.tenantName}, ${t("allBranches")}, ${t("lastMonths", { n: 6 })}`;

  return (
    <div className="flex min-h-screen bg-bg print:min-h-0 print:block">
      <SkipLink label={t("skipToContent")} />
      {/* A3 print/PDF report pages (audit-report, owner-report) render inside
          this shell so they keep normal RBAC + session handling; the nav rail
          and command bar are screen-only chrome and must not appear on the
          printed/PDF page. */}
      <div className="print:hidden">
        <Rail role={session.role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="print:hidden">
          <CommandBar
            tenantName={session.tenantName}
            role={session.role}
            email={session.email}
            recovered={toNumber(money.recoveredSar)}
            atRisk={toNumber(money.atRiskSar)}
            scopeLabel={scopeLabel}
            branches={branches}
          />
        </div>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1400px] flex-1 p-5 focus:outline-none md:p-6 print:max-w-none print:p-0"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
