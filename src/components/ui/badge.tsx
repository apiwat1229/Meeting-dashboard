import type { HTMLAttributes } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "neutral";

export function Badge({
  className = "",
  variant = "neutral",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span data-slot="badge" className={`status-badge status-${variant} ${className}`.trim()} {...props}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
