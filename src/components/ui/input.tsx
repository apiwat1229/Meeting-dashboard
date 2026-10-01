import type { ComponentProps } from "react";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input data-slot="input" className={`ui-input ${className}`.trim()} {...props} />;
}
