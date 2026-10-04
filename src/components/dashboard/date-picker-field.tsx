"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function dateKeyFromDate(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatDate(dateKey: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

export function DatePickerField({
  label,
  name,
  defaultValue = "",
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(`${value}T12:00:00.000Z`) : undefined;

  return (
    <div className="field-label task-date-field">
      <span>{label}</span>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className="button button-secondary task-date-picker-trigger"
          aria-label={`${label}, ${value ? formatDate(value) : "not set"}. Choose date`}
        >
          <CalendarDays size={15} aria-hidden="true" />
          <span>{value ? formatDate(value) : "Select date"}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          positionerClassName="project-date-popover-positioner"
          className="date-picker-popover task-date-popover"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              setValue(dateKeyFromDate(date));
              setOpen(false);
            }}
            timeZone="Asia/Bangkok"
            captionLayout="label"
            className="report-calendar"
          />
          {value && (
            <div className="task-date-popover-footer">
              <Button type="button" variant="ghost" onClick={() => { setValue(""); setOpen(false); }}>
                Clear date
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
