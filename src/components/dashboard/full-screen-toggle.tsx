"use client";

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { toast } from "@/components/ui/toast";

export function FullScreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      toast.error("Could not change full screen mode.");
    }
  }

  const label = isFullscreen ? "Exit full screen" : "Enter full screen";

  return (
    <button
      type="button"
      className="button button-secondary theme-topbar-button"
      aria-label={label}
      aria-pressed={isFullscreen}
      title={label}
      onClick={() => { void toggleFullscreen(); }}
    >
      {isFullscreen ? <Minimize2 size={17} aria-hidden="true" /> : <Maximize2 size={17} aria-hidden="true" />}
    </button>
  );
}
