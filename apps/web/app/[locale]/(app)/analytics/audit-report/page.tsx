import { setRequestLocale } from "next-intl/server";
import { requireSession } from "@/lib/session";
import { getAuditReportData } from "@/lib/data";
import { AuditReportDocument } from "@/components/modules/audit-report-document";

// No RBAC gate beyond requireSession: per rbac.ts's MATRIX, "analytics" is
// never hidden for any role (owner/finance/rcm full, clinician/admin read) —
// same as the parent Denial Analytics page this report is built from.
export const dynamic = "force-dynamic";

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession(locale);
  const bundle = await getAuditReportData(session.tenantId);
  return <AuditReportDocument tenantName={session.tenantName} bundle={bundle} />;
}
