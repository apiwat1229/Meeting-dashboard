"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

type PopupProps = Omit<React.ComponentProps<typeof DialogPrimitive.Popup>, "className"> & { className?: string };

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogContent({ className = "", onClick, ...props }: PopupProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop data-slot="dialog-backdrop" className="dialog-backdrop" onClick={(event) => event.stopPropagation()} />
      <DialogPrimitive.Viewport data-slot="dialog-viewport" className="dialog-viewport">
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={`dialog-content ${className}`.trim()}
          onClick={(event) => {
            event.stopPropagation();
            onClick?.(event);
          }}
          {...props}
        />
      </DialogPrimitive.Viewport>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className = "", ...props }: React.ComponentProps<typeof DialogPrimitive.Title> & { className?: string }) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={`dialog-title ${className}`.trim()} {...props} />;
}

function DialogDescription({ className = "", ...props }: React.ComponentProps<typeof DialogPrimitive.Description> & { className?: string }) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={`dialog-description ${className}`.trim()} {...props} />;
}

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger };
