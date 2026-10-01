"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function dateFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

function dateKeyFromDate(date: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(date: Date) {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${values.day} ${values.month?.replace(".", "")} ${values.year}`;
}

export function ReportDatePicker({ initialDateKey }: { initialDateKey: string }) {
  const [dateKey, setDateKey] = useState(initialDateKey);
  const [open, setOpen] = useState(false);
  const selectedDate = dateFromKey(dateKey);
  const formattedDate = formatDate(selectedDate);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className="button button-secondary date-picker-trigger"
        aria-label={`Choose report date, currently ${formattedDate}`}
        title="Choose report date"
      >
        <CalendarDays size={15} aria-hidden="true" />
        <span>{formattedDate}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="date-picker-popover">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            setDateKey(dateKeyFromDate(date));
            setOpen(false);
          }}
          timeZone="Asia/Bangkok"
          captionLayout="label"
          className="report-calendar"
        />
      </PopoverContent>
    </Popover>
  );
}
