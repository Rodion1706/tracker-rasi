// Two checkbox variants used across the tracker.
// RadialCheck — for tasks and overdue (round, radial gradient fill when done).
// DiamondCheck — for habits / checklist (♦ diamond clip, solid red when done).
// Both play a tick sound on transition to done (opt-in via localStorage).

import { playTick } from "../sound";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 12 L10 17 L19 7" />
    </svg>
  );
}

function Sparks() {
  // 6 tiny dots bursting out on complete (CSS handles the motion)
  return (
    <div className="check-sparks" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ "--i": i }} />
      ))}
    </div>
  );
}

export function RadialCheck({ done, onClick, className = "" }) {
  function handleClick(e) {
    if (!done) playTick();
    onClick && onClick(e);
  }
  return (
    <div
      className={`check-radial ${done ? "done" : ""} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <CheckIcon />
      {done && <Sparks />}
    </div>
  );
}

export function DiamondCheck({ done, onClick, className = "" }) {
  function handleClick(e) {
    if (!done) playTick();
    onClick && onClick(e);
  }
  return (
    <div
      className={`check-diamond ${done ? "done" : ""} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <CheckIcon />
      {done && <Sparks />}
    </div>
  );
}
