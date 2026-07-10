"use client";
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { value?: number }
>(({ className, value = 0, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    // Forwarded to Radix (a11y-review finding): previously only the
    // indicator's inline transform used `value`, so Radix never received it
    // and exposed the bar as indeterminate (no aria-valuenow/aria-valuemax).
    value={value}
    max={100}
    className={cn(
      "relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3",
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full bg-accent transition-transform duration-300"
      style={{ transform: `translateX(-${100 - value}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";
