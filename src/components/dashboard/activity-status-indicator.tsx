import { Check } from "lucide-react";

export function ActivityStatusIndicator({ completed }: { completed: boolean }) {
  return (
    <span
      className={`activity-status-indicator${completed ? " activity-status-completed" : ""}`}
      role="img"
      aria-label={completed ? "Completed" : "Not completed"}
    >
      {completed ? <Check size={15} aria-hidden="true" /> : <span className="activity-bullet" aria-hidden="true" />}
    </span>
  );
}
