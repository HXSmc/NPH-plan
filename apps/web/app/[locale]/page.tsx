import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/session";
import { landingModule } from "@/lib/rbac";
import { isOnboarded } from "@/lib/onboarding";
import { Landing } from "@/components/marketing/landing";

// Session-dependent; must run per request.
export const dynamic = "force-dynamic";

// Entry: authenticated users go to their role's landing module; everyone else
// sees the marketing landing (the number-as-hero pre-login page, design-brief §12).
// A2: a tenant with no captured baseline yet (brand-new, still pre-activation)
// is routed into the first-run corridor instead — additive, does not change
// where an already-onboarded tenant lands.
export default async function LocaleIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (session) {
    if (!(await isOnboarded(session.tenantId))) redirect(`/${locale}/onboarding`);
    redirect(`/${locale}/${landingModule(session.role)}`);
  }
  return <Landing />;
}
