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
  // Three-layer flame with strong dance: outer wraps the silhouette,
  // middle layer is a translucent inner shell that shimmies on its own
  // beat, core is a bright white-yellow blob that licks up. Sparks drift
  // off the tip on a slow loop. Each layer animates at a different speed
  // so the whole thing reads as a living flame, not a coloured shape.
  const gid = `fg-${tier.cls}`;
  const cid = `fc-${tier.cls}`;
  return (
    <div className={`flame flame-${tier.cls}`} aria-hidden>
      <svg viewBox="0 0 26 42" fill="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="currentColor" stopOpacity="0.7" />
            <stop offset="35%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
          <radialGradient id={cid} cx="50%" cy="80%" r="55%">
            <stop offset="0%"  stopColor="#fffbe5" stopOpacity="1" />
            <stop offset="50%" stopColor="#ffd24d" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ff8a1a" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Layer 1 — outer flame body, sharp asymmetric tip */}
        <path
          className="flame-outer"
          d="M13 1
             C 11 5 8 8 7 13
             C 5.5 18 4 23 5 28
             C 6 34 9 38 11 39
             C 11.6 39.4 12 39.5 13 39.5
             C 14 39.5 14.6 39.3 15 39
             C 17.5 37.5 20.2 33 21 28
             C 22 23 20 18 18.5 13
             C 17.5 10 17 7 16 4
             C 15.4 7 15 9 14 10
             C 13.5 8 13.7 5 13 1 Z"
          fill={`url(#${gid})`}
        />
        {/* Layer 2 — translucent inner shell, dances at its own speed */}
        <path
          className="flame-mid"
          d="M13 9
             C 11 12 9.5 16 9 21
             C 8.5 26 9 31 11 34
             C 11.6 34.6 12.4 34.8 13 34.8
             C 13.7 34.8 14.4 34.5 15 34
             C 17 31 17.6 26 17 21
             C 16.5 16 14.6 12 13 9 Z"
          fill="#fff5d4"
          opacity="0.35"
        />
        {/* Core — warm white-yellow heart */}
        <ellipse className="flame-core" cx="13" cy="29" rx="4.4" ry="6.4" fill={`url(#${cid})`} />
        {/* Tip highlight — sliver of white at the upper core */}
        <path className="flame-tip" d="M13 13 C 12.3 16 12.3 20 13 22 C 13.7 20 13.7 16 13 13 Z" fill="#fffbe5" opacity="0.85" />
        {/* Sparks drifting off the tip */}
        <circle className="flame-spark flame-spark-1" cx="13" cy="3"  r="0.9" fill="#fff5b8" />
        <circle className="flame-spark flame-spark-2" cx="9.5" cy="5" r="0.7" fill="#fff5b8" />
        <circle className="flame-spark flame-spark-3" cx="16" cy="6"  r="0.6" fill="#fff5b8" />
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
