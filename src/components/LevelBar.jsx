// Compact level indicator: rank name + XP progress bar to next level.
// Sits in the day-hero stats column, below streak/done.

export default function LevelBar({ levelInfo }) {
  if (!levelInfo) return null;
  const { level, next, progress, xp } = levelInfo;
  const pct = Math.round(progress * 100);
  const xpTo = next ? next.threshold - xp : 0;

  return (
    <div className="level-bar">
      <div className="level-bar-head">
        <div className="level-bar-rank">
          <span className="level-bar-n">LVL {level.id}</span>
          <span className="level-bar-name">{level.name}</span>
        </div>
        <div className="level-bar-xp">
          {next ? `${xp} / ${next.threshold} XP` : `${xp} XP · MAX`}
        </div>
      </div>
      <div className="level-bar-track">
        <div className="level-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {next && xpTo > 0 && (
        <div className="level-bar-next">
          {xpTo} XP to <span>{next.name}</span>
        </div>
      )}
    </div>
  );
}
