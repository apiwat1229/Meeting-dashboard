import type { HTMLAttributes } from "react";

type EmptyMediaProps = HTMLAttributes<HTMLDivElement> & { variant?: "default" | "icon" };

export function Empty({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="empty" className={`ui-empty ${className}`.trim()} {...props} />;
}

export function EmptyHeader({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="empty-header" className={`ui-empty-header ${className}`.trim()} {...props} />;
}

export function EmptyMedia({ variant = "default", className = "", ...props }: EmptyMediaProps) {
  return <div data-slot="empty-media" data-variant={variant} className={`ui-empty-media ${className}`.trim()} {...props} />;
}

export function EmptyTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 data-slot="empty-title" className={`ui-empty-title ${className}`.trim()} {...props} />;
}

export function EmptyDescription({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="empty-description" className={`ui-empty-description ${className}`.trim()} {...props} />;
}

export function EmptyContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="empty-content" className={`ui-empty-content ${className}`.trim()} {...props} />;
}
