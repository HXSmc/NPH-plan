import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireSession } from "@/lib/session";
import { isVisible } from "@/lib/rbac";
import { getOwnerReportData } from "@/lib/data";
import { OwnerReportDocument } from "@/components/modules/owner-report-document";

export const dynamic = "force-dynamic";

export default async function OwnerReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession(locale);
  // Server-enforced RBAC gate, mirroring the parent Recovery Tracking page:
  // rbac.ts's MATRIX marks "recovery" hidden for clinician.
  if (!isVisible(session.role, "recovery")) notFound();
  const bundle = await getOwnerReportData(session.tenantId);
  return <OwnerReportDocument tenantName={session.tenantName} bundle={bundle} />;
}
