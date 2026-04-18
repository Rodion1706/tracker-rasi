// Stat cards that sit above the daily progress bar.
// - Streak / Done — big gradient cards
// - Best / Week — smaller summary strip

export function BigStat({ label, value, unit, accent }) {
  return (
    <div className="stat-card">
      <div className="sc-label">{label}</div>
      <div className={`sc-value ${accent === "plain" ? "plain" : ""} ${accent === "done-all" ? "done-all" : ""}`}>
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  );
}

export function BestStat({ best }) {
  return (
    <div className="stat-small">
      <span className="ss-label">Best</span>
      <span className={`ss-value ${best > 0 ? "r" : ""}`}>{best}d</span>
    </div>
  );
}

export function WeekStat({ weekDays, today, habits, days }) {
  return (
    <div className="stat-small">
      <span className="ss-label">Week</span>
      <div style={{ display: "flex", gap: 3 }}>
        {weekDays.map((wd, i) => {
          const x = days[wd];
          const done = x && x.checks && habits.every(h => x.checks[h.id]);
          const isToday = wd === today;
          const future = wd > today;
          return (
            <div
              key={i}
              style={{
                width: 6,
                height: 14,
                borderRadius: 2,
                background: done ? "var(--red)" : future ? "rgba(42, 36, 48, 0.4)" : "var(--brd)",
                border: isToday ? "1px solid var(--red)" : "none",
                boxShadow: done ? "0 0 6px var(--red)" : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
