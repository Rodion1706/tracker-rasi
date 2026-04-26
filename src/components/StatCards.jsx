// Stat cards that sit above the daily progress bar.
// - Streak / Done — big gradient cards
// - Best / Week — smaller summary strip (tick-style to match YearStrip)

import Odometer from "./Odometer";

// Streak tier → flame appearance. Returns null for < 3 days (no flame).
function streakFlameTier(n) {
  if (n < 3) return null;
  if (n < 10) return { cls: "t1", label: "cold" };       // gray
  if (n < 20) return { cls: "t2", label: "warm" };       // warm gray
  if (n < 35) return { cls: "t3", label: "hot" };        // amber
  if (n < 50) return { cls: "t4", label: "burning" };    // deep red
  return { cls: "t5", label: "inferno" };                // full red + halo
}

function Flame({ tier }) {
  return (
    <div className={`flame flame-${tier.cls}`} aria-hidden>
      <svg viewBox="0 0 24 32" fill="none">
        <defs>
          <linearGradient id={`fg-${tier.cls}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.15" />
            <stop offset="55%" stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Outer flame silhouette */}
        <path
          className="flame-outer"
          d="M12 2 C 9 8 5 11 5 17 C 5 24 8 30 12 30 C 16 30 19 24 19 17 C 19 13 17 10 16 7 C 14.5 10 14 11 13 11 C 12.5 9.5 13 6 12 2 Z"
          fill={`url(#fg-${tier.cls})`}
        />
        {/* Inner core */}
        <path
          className="flame-inner"
          d="M12 11 C 10 14 8.5 17 8.5 21 C 8.5 25 10 29 12 29 C 14 29 15.5 25 15.5 21 C 15.5 17.5 14 15 12 11 Z"
          fill="currentColor"
          opacity="0.6"
        />
      </svg>
    </div>
  );
}

export function BigStat({ label, value, unit, accent, odometer }) {
  const flameTier = label === "Streak" ? streakFlameTier(Number(value) || 0) : null;
  return (
    <div className="stat-card">
      <div className="sc-label">{label}</div>
      <div className={`sc-value ${accent === "plain" ? "plain" : ""} ${accent === "done-all" ? "done-all" : ""}`}>
        {odometer ? <Odometer value={Number(value) || 0} /> : value}
        {unit && <span className="unit">{unit}</span>}
        {flameTier && <Flame tier={flameTier} />}
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

// Week indicator using the same tick style as YearStrip — rectangles that fill
export function WeekStat({ weekDays, today, habits, days }) {
  return (
    <div className="stat-small">
      <span className="ss-label">Week</span>
      <div className="ws-ticks">
        {weekDays.map((wd, i) => {
          const x = days[wd];
          const done = x && x.checks && habits.every(h => x.checks[h.id]);
          const hasData = x && x.checks && Object.keys(x.checks).length > 0;
          const isToday = wd === today;
          const future = wd > today;
          const cls = [
            "ws-tick",
            done ? "done" : "",
            isToday ? "current" : "",
            future ? "future" : "",
            hasData && !done && !future ? "partial" : "",
          ].filter(Boolean).join(" ");
          return <div key={i} className={cls} style={{ animationDelay: `${i * 0.04}s` }} />;
        })}
      </div>
    </div>
  );
}

// 7-day week strip for WeekTab — big top indicator, matches YearStrip
export function WeekBigStrip({ weekDays, today, habits, days }) {
  return (
    <div className="wbs">
      <div className="wbs-label">
        <div className="wbs-title">THIS WEEK</div>
        <div className="wbs-sub">{countDone(weekDays, habits, days)}/7 clean</div>
      </div>
      <div className="wbs-track">
        {weekDays.map((wd, i) => {
          const x = days[wd];
          const dc = habits.filter(h => x && x.checks && x.checks[h.id]).length;
          const tc = x && x.tasks ? x.tasks.filter(t => t.done).length : 0;
          const tt = x && x.tasks ? x.tasks.length : 0;
          const tot = dc + tc;
          const mx = habits.length + tt;
          const p = mx > 0 ? tot / mx : 0;
          const done = p === 1 && mx > 0;
          const partial = p > 0 && !done;
          const isToday = wd === today;
          const future = wd > today;
          const dayName = new Date(wd + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
          const dayNum = parseInt(wd.split("-")[2]);
          const cls = [
            "wbs-tick",
            done ? "done" : "",
            isToday ? "current" : "",
            future ? "future" : "",
            partial ? "partial" : "",
          ].filter(Boolean).join(" ");
          return (
            <div key={i} className="wbs-cell">
              <div className={cls} style={{ animationDelay: `${i * 0.06}s`, "--p": p }} title={`${dayName} ${dayNum} — ${Math.round(p * 100)}%`} />
              <div className="wbs-day-name">{dayName.slice(0, 3).toUpperCase()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function countDone(weekDays, habits, days) {
  return weekDays.filter(d => {
    const x = days[d];
    return x && x.checks && habits.every(h => x.checks[h.id]);
  }).length;
}
