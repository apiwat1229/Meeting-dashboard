"use client";

import * as React from "react";
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";

type ButtonVariant = "primary" | "secondary" | "danger";
type PopupProps = Omit<React.ComponentProps<typeof AlertDialogPrimitive.Popup>, "className"> & { className?: string };
type TitleProps = Omit<React.ComponentProps<typeof AlertDialogPrimitive.Title>, "className"> & { className?: string };
type DescriptionProps = Omit<React.ComponentProps<typeof AlertDialogPrimitive.Description>, "className"> & { className?: string };
type CloseProps = Omit<React.ComponentProps<typeof AlertDialogPrimitive.Close>, "className"> & { className?: string };

function AlertDialog(props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogContent({ className = "", ...props }: PopupProps) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-backdrop" className="alert-dialog-backdrop" />
      <AlertDialogPrimitive.Viewport data-slot="alert-dialog-viewport" className="alert-dialog-viewport">
        <AlertDialogPrimitive.Popup
          data-slot="alert-dialog-content"
          className={`alert-dialog-content ${className}`.trim()}
          {...props}
        />
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader({ className = "", ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-header" className={`alert-dialog-header ${className}`.trim()} {...props} />;
}

function AlertDialogTitle({ className = "", ...props }: TitleProps) {
  return <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={`alert-dialog-title ${className}`.trim()} {...props} />;
}

function AlertDialogDescription({ className = "", ...props }: DescriptionProps) {
  return <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={`alert-dialog-description ${className}`.trim()} {...props} />;
}

function AlertDialogFooter({ className = "", ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-dialog-footer" className={`alert-dialog-footer ${className}`.trim()} {...props} />;
}

function AlertDialogCancel({ className = "", ...props }: CloseProps) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" className={`button button-secondary ${className}`.trim()} {...props} />;
}

function AlertDialogAction({
  className = "",
  variant = "primary",
  ...props
}: CloseProps & { variant?: ButtonVariant }) {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-action" className={`button button-${variant} ${className}`.trim()} {...props} />;
}

function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  destructive = false,
  pending = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "danger" : "primary"} disabled={pending} onClick={onConfirm}>
            {pending ? "Saving…" : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  ConfirmActionDialog,
};
