import type { HTMLAttributes } from "react";

type BadgeTone = "success" | "warning" | "danger" | "neutral";

export function Badge({
  className = "",
  tone = "neutral",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span className={`status-badge status-${tone} ${className}`.trim()} {...props}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
