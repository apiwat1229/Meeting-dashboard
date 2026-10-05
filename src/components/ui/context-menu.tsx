"use client";

import { createElement, type KeyboardEvent, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";

type ContextMenuProps = {
  as: "article" | "div" | "li" | "tr";
  className: string;
  role?: "button" | "group" | "row" | "listitem";
  ariaLabel: string;
  ariaExpanded?: boolean;
  ariaHasPopup?: "dialog" | "menu";
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  onActivate?: () => void;
  onCreate?: () => void;
  createLabel?: string;
};

export function ContextMenu({ as, className, role, ariaLabel, ariaExpanded, ariaHasPopup, children, onEdit, onDelete, onActivate, onCreate, createLabel = "Create new" }: ContextMenuProps) {
  const trigger = createElement(as, {
    className,
    role,
    "aria-label": ariaLabel,
    "aria-expanded": ariaExpanded,
    "aria-haspopup": ariaHasPopup,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget || !onActivate || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      onActivate();
    },
  }, children);

  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger render={trigger} />
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Positioner className="context-menu-positioner">
          <ContextMenuPrimitive.Popup className="context-menu-popup">
            {onCreate && (
              <ContextMenuPrimitive.Item className="context-menu-item" onClick={onCreate}>
                <Plus size={14} aria-hidden="true" />
                {createLabel}
              </ContextMenuPrimitive.Item>
            )}
            {onEdit && (
              <ContextMenuPrimitive.Item className="context-menu-item" onClick={onEdit}>
                <Pencil size={14} aria-hidden="true" />
                Edit
              </ContextMenuPrimitive.Item>
            )}
            {onDelete && (
              <ContextMenuPrimitive.Item className="context-menu-item context-menu-item-danger" onClick={onDelete}>
                <Trash2 size={14} aria-hidden="true" />
                Delete
              </ContextMenuPrimitive.Item>
            )}
          </ContextMenuPrimitive.Popup>
        </ContextMenuPrimitive.Positioner>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}
