"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string; disabled?: boolean };

type SelectProps = {
  id?: string;
  name: string;
  options: readonly SelectOption[];
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export function Select({ id, name, options, defaultValue, placeholder = "Select an option", required = false, disabled = false, className = "" }: SelectProps) {
  return (
    <SelectPrimitive.Root
      id={id}
      name={name}
      items={options}
      defaultValue={defaultValue}
      required={required}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger id={id ? `${id}-trigger` : undefined} type="button" className={`shadcn-select-trigger ${className}`.trim()}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className="shadcn-select-trigger-icon" aria-hidden="true"><ChevronDown size={15} /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner className="shadcn-select-positioner" sideOffset={4}>
          <SelectPrimitive.Popup className="shadcn-select-popup">
            <SelectPrimitive.List className="shadcn-select-list">
              {options.map((option) => (
                <SelectPrimitive.Item key={option.value} value={option.value} disabled={option.disabled} className="shadcn-select-item">
                  <SelectPrimitive.ItemIndicator className="shadcn-select-item-indicator"><Check size={14} aria-hidden="true" /></SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
