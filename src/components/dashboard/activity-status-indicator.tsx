import { Check } from "lucide-react";

export function ActivityStatusIndicator({ completed }: { completed: boolean }) {
  if (!completed) return <span className="sr-only">Not completed</span>;

  return (
    <span
      className="activity-status-indicator activity-status-completed"
      role="img"
      aria-label="Completed"
    >
      <Check size={15} aria-hidden="true" />
    </span>
  );
}
