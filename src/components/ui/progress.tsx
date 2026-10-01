"use client";

import { Progress as ProgressPrimitive } from "@base-ui/react/progress";

export function Progress({ value, tone = "success" }: { value: number; tone?: "success" | "warning" | "danger" | "finish" }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className="progress-track"
      value={safeValue}
      aria-label={`Project progress ${safeValue}%`}
    >
      <ProgressPrimitive.Track data-slot="progress-track" className="progress-track-inner">
        <ProgressPrimitive.Indicator data-slot="progress-indicator" className={`progress-fill progress-${tone}`} />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}
