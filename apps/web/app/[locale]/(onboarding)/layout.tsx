import type { ReactNode } from "react";

// Chromeless shell for the A2 first-run corridor (design-brief §9: "the
// Ingest dropzone in a focused, chromeless frame"). No Rail, no CommandBar, no
// tenant switcher — a single guided path, one primary action per screen.
export const dynamic = "force-dynamic";

export default function OnboardingGroupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex h-14 items-center px-5">
        <span className="grid size-8 place-items-center rounded-md bg-accent text-accent-fg font-display text-h3">
          T
        </span>
        <span className="ms-2 font-display text-h3 font-medium">Taweed</span>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-xl flex-1 px-5 pb-16 focus:outline-none"
      >
        {children}
      </main>
    </div>
  );
}
