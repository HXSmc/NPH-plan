"use client";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Two-level tenant/branch scope (design-brief §7). Tenant is fixed to the session
// (one contract); branches are a single-select filter over the tenant's real
// branches, persisted to the `?branch=` URL param so it's shareable and survives
// a reload. CONTAINED scope (deliberate, not the full design-brief spec): the
// Analytics, Scrubber, Appeals, and Recovery pages all read this param and narrow
// their data (see lib/data.ts's getAnalytics/getScrubRows/getAppealables/
// getRecovery `branchId` params and the scope-cut comment on getAnalytics) —
// only Ingest still shows this same switcher in its command-bar chrome without
// filtering on it.

// WCAG AA (a11y.md finding #18/F3): bare `text-accent` on `bg-surface-1` is
// 5.90:1 in light theme but only ~3.15:1 in dark, where `--accent` (#2557e4)
// is not redefined while `--accent-subtle` is retuned darker. Same root cause
// as badge.tsx (finding #5) — swap to the solid accent fill in `.dark`
// (bg-accent/text-accent-fg, ~5.9:1 AA) and keep the subtle pairing for light.
const activeItemClass =
  "font-medium bg-accent-subtle text-accent dark:bg-accent dark:text-accent-fg";

export function TenantSwitcher({
  tenantName,
  branches,
}: {
  tenantName: string;
  branches: { id: string; name: string }[];
}) {
  const t = useTranslations("common");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, setIsPending] = useState(false);

  const selectedId = searchParams.get("branch");
  const selectedBranch = branches.find((b) => b.id === selectedId);
  const scopeLabel = selectedBranch ? selectedBranch.name : t("allBranches");

  function selectBranch(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("branch", id);
    else params.delete("branch");
    const qs = params.toString();
    // A soft `router.push()` for a query-param-only change (same route,
    // just ?branch=) never applied in a real production build — the RSC
    // fetch came back 200 but React left the old page/DOM in place forever
    // (same client RSC-apply gap that hit the Recovery mark-won button; see
    // recovery-outcome-actions.tsx). A hard navigation sidesteps it: it
    // reliably shows the branch-scoped data every time this was tested.
    setIsPending(true);
    window.location.href = qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        aria-busy={isPending}
        className="focus-ring flex items-center gap-2 rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-body hover:bg-surface-2 disabled:cursor-wait disabled:opacity-70"
      >
        <Building2 className="size-4 text-muted" aria-hidden />
        <span className="max-w-[10rem] truncate font-medium">{tenantName}</span>
        {/* Scope must stay in the trigger's accessible name at every viewport.
            `sr-only` keeps it in the a11y tree unconditionally; the second
            span is the visually-responsive copy (shown at `sm`+, hidden on
            phone) marked `aria-hidden` so it isn't announced twice. Mirrors
            the rail.tsx fix (a11y.md finding #15). */}
        <span className="sr-only">· {scopeLabel}</span>
        <span className="hidden text-muted sm:inline" aria-hidden="true">
          · {scopeLabel}
        </span>
        {isPending ? (
          <Loader2
            className="size-4 animate-spin text-muted motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <ChevronDown className="size-4 text-muted" aria-hidden />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[14rem]">
        <DropdownMenuLabel>{tenantName}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={selectedId ?? ""}
          onValueChange={(id) => selectBranch(id || null)}
        >
          <DropdownMenuRadioItem
            value=""
            className={!selectedId ? activeItemClass : undefined}
          >
            {t("allBranches")}
          </DropdownMenuRadioItem>
          {branches.map((b) => (
            <DropdownMenuRadioItem
              key={b.id}
              value={b.id}
              className={b.id === selectedId ? activeItemClass : undefined}
            >
              {b.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
