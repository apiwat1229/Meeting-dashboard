"use client";

import * as React from "react";
import { Toast as ToastPrimitive } from "@base-ui/react/toast";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";

const toastManager = ToastPrimitive.createToastManager();

export const toast = {
  success(message: string) {
    toastManager.add({ title: message, type: "success" });
  },
  error(message: string) {
    toastManager.add({ title: message, type: "error", priority: "high" });
  },
  info(message: string) {
    toastManager.add({ title: message, type: "info" });
  },
};

function ToastViewport() {
  const manager = ToastPrimitive.useToastManager();

  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport data-slot="toast-viewport" className="toast-viewport">
        {manager.toasts.map((item) => (
          <ToastPrimitive.Positioner key={item.id} toast={item} className="toast-positioner">
            <ToastPrimitive.Root toast={item} className="toast-root">
              <ToastPrimitive.Content className="toast-content">
                <span className="toast-icon" aria-hidden="true">
                  {item.type === "success" ? <CircleCheck size={18} /> : item.type === "error" ? <CircleAlert size={18} /> : <Info size={18} />}
                </span>
                <div className="toast-copy">
                  {item.title && <ToastPrimitive.Title className="toast-title" />}
                  {item.description && <ToastPrimitive.Description className="toast-description" />}
                </div>
                <ToastPrimitive.Close className="toast-close" aria-label="Dismiss notification"><X size={15} /></ToastPrimitive.Close>
              </ToastPrimitive.Content>
            </ToastPrimitive.Root>
          </ToastPrimitive.Positioner>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider toastManager={toastManager} timeout={4500} limit={4}>
      {children}
      <ToastViewport />
    </ToastPrimitive.Provider>
  );
}
