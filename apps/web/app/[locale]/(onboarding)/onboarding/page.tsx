import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { isOnboarded } from "@/lib/onboarding";
import { getBranches } from "@/lib/data";
import { landingModule } from "@/lib/rbac";
import { OnboardingCorridor } from "@/components/modules/onboarding-corridor";

// Tenant-scoped, session-dependent; never statically prerendered.
export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireSession(locale);
  // A direct nav here after activation must not re-run the corridor.
  if (await isOnboarded(session.tenantId)) {
    redirect(`/${locale}/${landingModule(session.role)}`);
  }
  const branches = await getBranches(session.tenantId);
  return <OnboardingCorridor tenantName={session.tenantName} branches={branches} />;
}
