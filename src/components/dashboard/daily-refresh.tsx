"use client";

import { useEffect } from "react";
import { getBangkokDateKey } from "@/lib/date-key";

export function DailyRefresh({ initialDateKey }: { initialDateKey: string }) {
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (getBangkokDateKey() !== initialDateKey) window.location.reload();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [initialDateKey]);

  return null;
}
