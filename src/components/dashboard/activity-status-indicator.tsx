import { Check, Clock } from "lucide-react";

export function ActivityStatusIndicator({ completed, continuing }: { completed: boolean; continuing: boolean }) {
  if (!completed && !continuing) return <span className="activity-status-placeholder" aria-hidden="true" />;

  const label = completed ? "Done" : "Continue";

  return (
    <span
      className={`activity-status-indicator${completed ? " activity-status-completed" : " activity-status-continuing"}`}
      role="img"
      aria-label={label}
      title={label}
    >
      {completed ? <Check size={14} aria-hidden="true" /> : <Clock size={16} aria-hidden="true" />}
    </span>
  );
}
