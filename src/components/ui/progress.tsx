export function Progress({ value, tone = "success" }: { value: number; tone?: "success" | "warning" | "danger" }) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Project progress ${safeValue}%`}
    >
      <span className={`progress-fill progress-${tone}`} style={{ width: `${safeValue}%` }} />
    </div>
  );
}
