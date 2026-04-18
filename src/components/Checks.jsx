// Two checkbox variants used across the tracker.
// RadialCheck — for tasks and overdue (round, radial gradient fill when done).
// DiamondCheck — for habits / checklist (♦ diamond clip, solid red when done).

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 12 L10 17 L19 7" />
    </svg>
  );
}

export function RadialCheck({ done, onClick, className = "" }) {
  return (
    <div
      className={`check-radial ${done ? "done" : ""} ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <CheckIcon />
    </div>
  );
}

export function DiamondCheck({ done, onClick, className = "" }) {
  return (
    <div
      className={`check-diamond ${done ? "done" : ""} ${className}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <CheckIcon />
    </div>
  );
}
