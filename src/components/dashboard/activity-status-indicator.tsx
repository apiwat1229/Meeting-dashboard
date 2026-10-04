import { Check, CircleAlert, Clock } from "lucide-react";

export function ActivityStatusIndicator({ completed, continuing, highPriority }: { completed: boolean; continuing: boolean; highPriority: boolean }) {
  if (!completed && !continuing && !highPriority) return <span className="activity-status-placeholder" aria-hidden="true" />;

  const label = [completed ? "Done" : continuing ? "Continue" : null, highPriority ? "High priority" : null]
    .filter(Boolean)
    .join(", ");

  return (
    <span
      className={`activity-status-indicator${completed ? " activity-status-completed" : ""}${continuing && !completed ? " activity-status-continuing" : ""}${highPriority && !completed && !continuing ? " activity-status-high-only" : ""}`}
      role="img"
      aria-label={label}
      title={label}
    >
      {completed ? <Check size={14} aria-hidden="true" /> : continuing ? <Clock size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />}
      {highPriority && (completed || continuing) && (
        <span className="activity-status-priority-alert" aria-hidden="true"><CircleAlert size={12} /></span>
      )}
    </span>
  );
}
