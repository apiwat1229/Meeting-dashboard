"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, CirclePlay, Flag } from "lucide-react";
import { formatProjectDate } from "@/lib/project-dates";

type ProjectDateChange = { id: number; oldValue: string | null };

export function ProjectScheduleDate({ dateKey, changes, label, icon }: {
  dateKey: string | null;
  changes: ProjectDateChange[];
  label: string;
  icon: "start" | "finish";
}) {
  const [expanded, setExpanded] = useState(false);
  const filteredChanges = changes.filter((change) => {
    if (dateKey && change.oldValue && change.oldValue > dateKey) return false;
    return change.oldValue !== dateKey;
  });
  const seenPreviousDates = new Set<string | null>();
  const uniquePreviousChanges = [...filteredChanges]
    .reverse()
    .filter((change) => {
      if (seenPreviousDates.has(change.oldValue)) return false;
      seenPreviousDates.add(change.oldValue);
      return true;
    })
    .reverse();
  const visibleChanges = expanded ? uniquePreviousChanges : uniquePreviousChanges.slice(-1);
  const hasVisibleHistory = uniquePreviousChanges.length > 0;
  const hasMoreThanLatest = uniquePreviousChanges.length > 1;
  const historyDateSummary = [...uniquePreviousChanges.map((change) => change.oldValue), dateKey]
    .map((date) => date ? formatProjectDate(date) : "not set")
    .join(" → ");
  const historyLabel = hasVisibleHistory ? ` Date history: ${historyDateSummary}.` : "";
  const ScheduleIcon = icon === "start" ? CirclePlay : Flag;

  return (
    <span
      className={`project-schedule-date${hasVisibleHistory ? " project-schedule-date-history" : ""}`}
      title={hasVisibleHistory ? `${label} date history: ${historyDateSummary}` : label}
      aria-label={`${label} date: ${dateKey ? formatProjectDate(dateKey) : "not set"}.${historyLabel}`}
    >
      <ScheduleIcon className="project-schedule-icon" aria-hidden="true" />
      <span className="project-schedule-date-values">
        {visibleChanges.map((change, index) => {
          const isLastVisibleChange = index === visibleChanges.length - 1;
          return (
            <span className="project-schedule-date-history-entry" key={change.id}>
              <del>
                {change.oldValue ? <time dateTime={change.oldValue}>{formatProjectDate(change.oldValue)}</time> : "—"}
              </del>
              {isLastVisibleChange && hasMoreThanLatest && (
                <button
                  type="button"
                  className="project-date-history-toggle"
                  aria-expanded={expanded}
                  aria-label={expanded ? `Show latest ${label.toLowerCase()} date only` : `Show all ${uniquePreviousChanges.length} previous ${label.toLowerCase()} dates`}
                  title={expanded ? "Show latest date only" : `Show all ${uniquePreviousChanges.length} previous dates`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpanded((current) => !current);
                  }}
                >
                  <span>×{uniquePreviousChanges.length}</span>
                  {expanded ? <ChevronUp size={11} aria-hidden="true" /> : <ChevronDown size={11} aria-hidden="true" />}
                </button>
              )}
            </span>
          );
        })}
        {dateKey ? <time dateTime={dateKey}>{formatProjectDate(dateKey)}</time> : <span>—</span>}
      </span>
    </span>
  );
}
