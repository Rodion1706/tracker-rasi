// Segmented progress bar — 20 ticks that fill based on done/total.
// Used for Day overall progress and for Goal progress.
// Matches the visual language of YearStrip / WeekBigStrip.
export default function ProgressTicks({ done, total, segments = 20 }) {
  const allDone = total > 0 && done >= total;
  const filled = total > 0 ? Math.round((done / total) * segments) : 0;
  const ticks = [];
  for (let i = 0; i < segments; i++) {
    const isFilled = i < filled;
    const cls = [
      "progress-seg",
      isFilled ? "on" : "",
      isFilled && allDone ? "done-all" : "",
    ].filter(Boolean).join(" ");
    ticks.push(
      <div
        key={i}
        className={cls}
        style={{ animationDelay: `${i * 0.02}s` }}
      />
    );
  }
  return <div className="progress">{ticks}</div>;
}

// For goal progress — slightly thinner, cap at 20 segments regardless of target size
export function GoalTicks({ current, target, segments = 20 }) {
  const pct = target > 0 ? current / target : 0;
  const filled = Math.min(segments, Math.round(pct * segments));
  const complete = pct >= 1;
  const ticks = [];
  for (let i = 0; i < segments; i++) {
    const isFilled = i < filled;
    const cls = [
      "seg",
      isFilled ? "on" : "",
      isFilled && complete ? "complete-all" : "",
    ].filter(Boolean).join(" ");
    ticks.push(
      <div
        key={i}
        className={cls}
        style={{ animationDelay: `${i * 0.02}s` }}
      />
    );
  }
  return <div className="seg-bar">{ticks}</div>;
}
