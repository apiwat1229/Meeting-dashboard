import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section data-slot="card" className={`surface-card ${className}`.trim()} {...props} />;
}
