// Level indicator: rank name + XP bar. When a new level is unlocked
// (XP crossed the next threshold), the bar parks at 100% with a
// pulsing CLAIM state — Boss has to tap it to advance, video-game
// style. Tapping fires the LevelClaim cinematic.

export default function LevelBar({ levelInfo, onClaim }) {
  if (!levelInfo) return null;
  const { level, next, progress, xp, available, availableCount } = levelInfo;
  const pct = Math.round(progress * 100);
  const xpTo = next && !available ? next.threshold - xp : 0;

  function handleClick() {
    if (available && onClaim) onClaim();
  }

  return (
    <div
      className={`level-bar ${available ? "claimable" : ""}`}
      onClick={handleClick}
      role={available ? "button" : undefined}
      tabIndex={available ? 0 : undefined}
    >
      <div className="level-bar-head">
        <div className="level-bar-rank">
          <span className="level-bar-n">LVL {level.id}</span>
          <span className="level-bar-name">{level.name}</span>
        </div>
        <div className="level-bar-xp">
          {available
            ? (availableCount > 1
                ? `+${availableCount} levels ready`
                : "ready to claim")
            : (next ? `${xp} / ${next.threshold} XP` : `${xp} XP · MAX`)}
        </div>
      </div>
      <div className="level-bar-track">
        <div className="level-bar-fill" style={{ width: `${pct}%` }} />
        {available && <div className="level-bar-fill-shine" />}
      </div>
      {available ? (
        <div className="level-bar-claim">
          ◆ TAP TO CLAIM {next.name} ◆
        </div>
      ) : (
        next && xpTo > 0 && (
          <div className="level-bar-next">
            {xpTo} XP to <span>{next.name}</span>
          </div>
        )
      )}
    </div>
  );
}
