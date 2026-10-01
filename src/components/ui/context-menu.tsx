"use client";

import { createElement, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";

type ContextMenuProps = {
  as: "article" | "div" | "li";
  className: string;
  role?: "group" | "row";
  ariaLabel: string;
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
};

export function ContextMenu({ as, className, role, ariaLabel, children, onEdit, onDelete }: ContextMenuProps) {
  const trigger = createElement(as, { className, role, "aria-label": ariaLabel, tabIndex: 0 }, children);

  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger render={trigger} />
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Positioner className="context-menu-positioner">
          <ContextMenuPrimitive.Popup className="context-menu-popup">
            <ContextMenuPrimitive.Item className="context-menu-item" onClick={onEdit}>
              <Pencil size={14} aria-hidden="true" />
              Edit
            </ContextMenuPrimitive.Item>
            <ContextMenuPrimitive.Separator className="context-menu-separator" />
            <ContextMenuPrimitive.Item className="context-menu-item context-menu-item-danger" onClick={onDelete}>
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </ContextMenuPrimitive.Item>
          </ContextMenuPrimitive.Popup>
        </ContextMenuPrimitive.Positioner>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}
