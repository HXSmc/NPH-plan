"use client";
import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      // a11y fix (WCAG 1.4.11 Non-text Contrast): the unchecked track was
      // `bg-surface-3` against the `Card` background (`bg-surface-1`) —
      // ~1.18:1 light / ~1.2:1 dark, far under the 3:1 minimum for
      // identifying a UI component and its state, so an unchecked switch
      // was functionally invisible (see docs/a11y.md finding for
      // ui/switch.tsx). `text-faint` (used here via the `faint` Tailwind
      // color, i.e. `bg-faint`) already has a light/dark pairing in
      // globals.css that was rejected for *text* use elsewhere (below the
      // 4.5:1 text minimum, see landing.tsx's caption fix) but clears the
      // 3:1 non-text threshold against `surface-1` (3.42:1 light / 3.68:1
      // dark) and against the white thumb (3.42:1 light / 5.04:1 dark) —
      // reusing an existing token under the criterion it actually
      // satisfies, instead of inventing a new one. The fill itself is the
      // identifying boundary (same reasoning as the already-AA
      // `data-[state=checked]:bg-accent` fill below), so the surrounding
      // `border-hairline` does not also need to be strengthened.
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-hairline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent data-[state=checked]:bg-accent data-[state=unchecked]:bg-faint",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5 rtl:data-[state=checked]:-translate-x-4 rtl:data-[state=unchecked]:-translate-x-0.5" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
