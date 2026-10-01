import type { ComponentProps } from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonProps = Omit<ComponentProps<typeof ButtonPrimitive>, "className"> & {
  className?: string;
  variant?: ButtonVariant;
};

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  return <ButtonPrimitive data-slot="button" className={`button button-${variant} ${className}`.trim()} {...props} />;
}
