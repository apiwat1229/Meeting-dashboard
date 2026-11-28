"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";

const storageKey = "dashboard.project-column-widths";
const minColumnWidth = 90;

function headerCells(handle: HTMLElement) {
  return Array.from(handle.closest("tr")?.querySelectorAll("th") ?? []);
}

function applyWidths(cells: HTMLTableCellElement[], widths: number[]) {
  const total = widths.reduce((sum, width) => sum + width, 0);
  cells.forEach((cell, index) => { cell.style.width = `${(widths[index] / total) * 100}%`; });
}

// Moves the boundary between this column and the next, keeping the table width unchanged.
function shiftBoundary(widths: number[], index: number, delta: number) {
  const next = [...widths];
  const limited = Math.max(
    Math.min(0, minColumnWidth - widths[index]),
    Math.min(delta, Math.max(0, widths[index + 1] - minColumnWidth)),
  );
  next[index] += limited;
  next[index + 1] -= limited;
  return next;
}

function saveWidths(cells: HTMLTableCellElement[]) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(cells.map((cell) => cell.offsetWidth)));
  } catch {
    // Storage can be unavailable (private window); widths then last until reload.
  }
}

export function ColumnResizeHandle({ index, label }: { index: number; label: string }) {
  const handleRef = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ startX: number; widths: number[] } | null>(null);

  useEffect(() => {
    if (index !== 0 || !handleRef.current) return;
    const cells = headerCells(handleRef.current);
    try {
      const saved: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
      if (Array.isArray(saved) && saved.length === cells.length && saved.every((width) => typeof width === "number" && width > 0)) {
        applyWidths(cells, saved);
      }
    } catch {
      // Ignore unreadable saved widths and keep the default layout.
    }
  }, [index]);

  function onPointerDown(event: PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startX: event.clientX, widths: headerCells(event.currentTarget).map((cell) => cell.offsetWidth) };
  }

  function onPointerMove(event: PointerEvent<HTMLSpanElement>) {
    if (!drag.current) return;
    applyWidths(headerCells(event.currentTarget), shiftBoundary(drag.current.widths, index, event.clientX - drag.current.startX));
  }

  function onPointerEnd(event: PointerEvent<HTMLSpanElement>) {
    if (!drag.current) return;
    drag.current = null;
    saveWidths(headerCells(event.currentTarget));
  }

  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const cells = headerCells(event.currentTarget);
    applyWidths(cells, shiftBoundary(cells.map((cell) => cell.offsetWidth), index, event.key === "ArrowLeft" ? -16 : 16));
    saveWidths(cells);
  }

  function reset(handle: HTMLElement) {
    headerCells(handle).forEach((cell) => { cell.style.width = ""; });
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nothing saved to clear.
    }
  }

  return (
    <span
      ref={handleRef}
      className="column-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label} column`}
      title="Drag to resize. Double-click to reset."
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onKeyDown={onKeyDown}
      onDoubleClick={(event) => reset(event.currentTarget)}
    />
  );
}
