// Stat cards that sit above the daily progress bar.
// - Streak / Done — big gradient cards
// - Best / Week — smaller summary strip (tick-style to match YearStrip)

import Odometer from "./Odometer";
import { activeHabitsOn } from "../gamification";

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
  // Wider teardrop silhouette — was too narrow. Three layers each
  // animating on a non-divisible duration (4.3s / 3.7s / 2.9s) so the
  // pattern never quite repeats — feels like watching a real candle.
  const gid = `fg-${tier.cls}`;
  const cid = `fc-${tier.cls}`;
  return (
    <div className={`flame flame-${tier.cls}`} aria-hidden>
      <svg viewBox="0 0 28 42" fill="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="currentColor" stopOpacity="0.55" />
            <stop offset="40%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
          <radialGradient id={cid} cx="50%" cy="78%" r="55%">
            <stop offset="0%"  stopColor="#fffce8" stopOpacity="1" />
            <stop offset="50%" stopColor="#ffd24d" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ff8a1a" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Layer 1 — wide teardrop body */}
        <path
          className="flame-outer"
          d="M14 2.5
             C 13 4.5 13.2 6.5 13 9
             C 11 13 8 17 7 22
             C 6 27 6 32 8 35
             C 10 37.5 12 38.5 14 38.5
             C 16 38.5 18 37.5 20 35
             C 22 32 22 27 21 22
             C 20 17 17 13 15 9
             C 14.8 6.5 15 4.5 14 2.5 Z"
          fill={`url(#${gid})`}
        />
        {/* Layer 2 — middle shell */}
        <path
          className="flame-mid"
          d="M14 9
             C 13 12 11 16 10.5 21
             C 10 26 10.5 30 12 33
             C 13 34 13.5 34.5 14 34.5
             C 14.5 34.5 15 34 16 33
             C 17.5 30 18 26 17.5 21
             C 17 16 15 12 14 9 Z"
          fill="#fff5d4"
          opacity="0.4"
        />
        {/* Core — bright warm heart */}
        <ellipse className="flame-core" cx="14" cy="30" rx="4.2" ry="6.4" fill={`url(#${cid})`} />
        {/* Tip — tall sliver at upper core */}
        <path className="flame-tip" d="M14 14 C 13.4 17 13.4 21 14 23 C 14.6 21 14.6 17 14 14 Z" fill="#fffce8" opacity="0.8" />
        {/* Sparks — three at irregular cycles */}
        <circle className="flame-spark flame-spark-1" cx="14" cy="3" r="0.9" fill="#fff5b8" />
        <circle className="flame-spark flame-spark-2" cx="11" cy="5" r="0.6" fill="#fff5b8" />
        <circle className="flame-spark flame-spark-3" cx="17" cy="7" r="0.5" fill="#fff5b8" />
      </svg>
    </div>
  );
}

export function BigStat({ label, value, unit, accent, odometer, subText }) {
  const flameTier = label === "Streak" ? streakFlameTier(Number(value) || 0) : null;
  return (
    <div className="stat-card">
      <div className="sc-label">{label}</div>
      <div className={`sc-value ${accent === "plain" ? "plain" : ""} ${accent === "done-all" ? "done-all" : ""}`}>
        {odometer ? <Odometer value={Number(value) || 0} /> : value}
        {unit && <span className="unit">{unit}</span>}
        {flameTier && <Flame tier={flameTier} />}
      </div>
      {subText && <div className="sc-subtext">{subText}</div>}
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
          const dayHabits = activeHabitsOn(habits, wd);
          const done = x && x.checks && dayHabits.length > 0 && dayHabits.every(h => x.checks[h.id]);
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
          const dayHabits = activeHabitsOn(habits, wd);
          const dc = dayHabits.filter(h => x && x.checks && x.checks[h.id]).length;
          const tc = x && x.tasks ? x.tasks.filter(t => t.done).length : 0;
          const tt = x && x.tasks ? x.tasks.length : 0;
          const tot = dc + tc;
          const mx = dayHabits.length + tt;
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
    const dayHabits = activeHabitsOn(habits, d);
    return x && x.checks && dayHabits.length > 0 && dayHabits.every(h => x.checks[h.id]);
  }).length;
}
