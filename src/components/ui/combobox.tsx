"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { Check, ChevronDown, Search } from "lucide-react";

export type ComboboxOption = { value: string; label: string };

type ComboboxSelectProps = {
  name?: string;
  options: readonly ComboboxOption[];
  defaultValue?: string | null;
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
};

export function ComboboxSelect({
  name,
  options,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search options...",
  emptyMessage = "No options found.",
  className = "",
  disabled = false,
}: ComboboxSelectProps) {
  const optionLabels = React.useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  );
  const values = React.useMemo(() => options.map((option) => option.value), [options]);

  return (
    <ComboboxPrimitive.Root
      name={name}
      items={values}
      disabled={disabled}
      defaultValue={defaultValue}
      value={value}
      itemToStringLabel={(option) => optionLabels.get(option) ?? ""}
      itemToStringValue={(option) => option}
      onValueChange={(nextValue) => onValueChange?.(nextValue)}
      autoHighlight
    >
      <ComboboxPrimitive.Trigger className={`shadcn-combobox-trigger ${className}`.trim()}>
        <ComboboxPrimitive.Value placeholder={placeholder} />
        <ComboboxPrimitive.Icon className="shadcn-combobox-trigger-icon" aria-hidden="true">
          <ChevronDown size={15} />
        </ComboboxPrimitive.Icon>
      </ComboboxPrimitive.Trigger>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner className="shadcn-combobox-positioner" sideOffset={4}>
          <ComboboxPrimitive.Popup className="shadcn-combobox-popup">
            <div className="shadcn-combobox-search">
              <Search size={14} aria-hidden="true" />
              <ComboboxPrimitive.Input aria-label={searchPlaceholder} placeholder={searchPlaceholder} />
            </div>
            <ComboboxPrimitive.List className="shadcn-combobox-list">
              {(optionValue: string) => (
                <ComboboxPrimitive.Item key={optionValue} value={optionValue} className="shadcn-combobox-item">
                  <span>{optionLabels.get(optionValue) ?? optionValue}</span>
                  <ComboboxPrimitive.ItemIndicator className="shadcn-combobox-item-indicator">
                    <Check size={14} />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
            <ComboboxPrimitive.Empty className="shadcn-combobox-empty">
              {emptyMessage}
            </ComboboxPrimitive.Empty>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}

type MultiComboboxSelectProps = {
  options: readonly ComboboxOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  footer?: React.ReactNode;
  renderValue?: (selectedValues: string[], labels: string[]) => React.ReactNode;
};

export function MultiComboboxSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select one or more options",
  searchPlaceholder = "Search options...",
  emptyMessage = "No options found.",
  className = "",
  disabled = false,
  ariaLabel,
  open,
  onOpenChange,
  footer,
  renderValue,
}: MultiComboboxSelectProps) {
  const optionLabels = React.useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  );
  const values = React.useMemo(() => options.map((option) => option.value), [options]);

  return (
    <ComboboxPrimitive.Root
      multiple
      items={values}
      value={value}
      onValueChange={(nextValue) => onValueChange(Array.isArray(nextValue) ? nextValue : [])}
      open={open}
      onOpenChange={(nextOpen) => onOpenChange?.(nextOpen)}
      disabled={disabled}
      itemToStringLabel={(option) => optionLabels.get(option) ?? ""}
      itemToStringValue={(option) => option}
      autoHighlight
    >
      <ComboboxPrimitive.Trigger aria-label={ariaLabel} className={`shadcn-combobox-trigger ${className}`.trim()}>
        <ComboboxPrimitive.Value>
          {(selectedValues: string[]) => {
            const labels = selectedValues.map((selectedValue) => optionLabels.get(selectedValue) ?? selectedValue);
            if (renderValue) return renderValue(selectedValues, labels);
            return labels.length > 0 ? (
              <span className="shadcn-combobox-multiple-value">
                {labels.map((label, index) => <span key={`${selectedValues[index]}-${index}`}>{label}</span>)}
              </span>
            ) : placeholder;
          }}
        </ComboboxPrimitive.Value>
        <ComboboxPrimitive.Icon className="shadcn-combobox-trigger-icon" aria-hidden="true">
          <ChevronDown size={15} />
        </ComboboxPrimitive.Icon>
      </ComboboxPrimitive.Trigger>
      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner className="shadcn-combobox-positioner" sideOffset={4}>
          <ComboboxPrimitive.Popup className="shadcn-combobox-popup">
            <div className="shadcn-combobox-search">
              <Search size={14} aria-hidden="true" />
              <ComboboxPrimitive.Input aria-label={searchPlaceholder} placeholder={searchPlaceholder} />
            </div>
            <ComboboxPrimitive.List className="shadcn-combobox-list">
              {(optionValue: string) => (
                <ComboboxPrimitive.Item key={optionValue} value={optionValue} className="shadcn-combobox-item">
                  <span>{optionLabels.get(optionValue) ?? optionValue}</span>
                  <ComboboxPrimitive.ItemIndicator className="shadcn-combobox-item-indicator">
                    <Check size={14} />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
            <ComboboxPrimitive.Empty className="shadcn-combobox-empty">
              {emptyMessage}
            </ComboboxPrimitive.Empty>
            {footer}
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
