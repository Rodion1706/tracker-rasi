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
  // TikTok-style flame: tall pointed silhouette, bright white-yellow core,
  // slight asymmetric tilt. Tier color drives the body gradient via the
  // tier-specific stop colors, the core is always warm-white so the flame
  // looks alive even on low streaks.
  const gid = `fg-${tier.cls}`;
  const cid = `fc-${tier.cls}`;
  return (
    <div className={`flame flame-${tier.cls}`} aria-hidden>
      <svg viewBox="0 0 24 36" fill="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="currentColor" stopOpacity="0.85" />
            <stop offset="40%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
          <radialGradient id={cid} cx="50%" cy="78%" r="55%">
            <stop offset="0%"  stopColor="#fff8d6" stopOpacity="1" />
            <stop offset="55%" stopColor="#ffd24d" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ff8a1a" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Outer flame silhouette — tall, pointed top, slight S-curve lick on the right */}
        <path
          className="flame-outer"
          d="M12 1.5
             C 10 6 7.5 9 7 14
             C 6.5 18 5 22 6 27
             C 7 32 9.5 34.5 12 34.5
             C 14.5 34.5 17 32 18 27
             C 19 22 17.8 18 17 14
             C 16.4 11 16 8 15 5
             C 14 8.5 13.4 10 12.6 10
             C 12 8.5 13 5 12 1.5 Z"
          fill={`url(#${gid})`}
        />
        {/* Inner bright core — warm white-yellow, always glowing */}
        <ellipse className="flame-inner" cx="12" cy="26" rx="4.6" ry="6.6" fill={`url(#${cid})`} />
        {/* Tip highlight — small white spear at the top of the core */}
        <path className="flame-tip" d="M12 9 C 11.4 12 11.4 15 12 17 C 12.6 15 12.6 12 12 9 Z" fill="#fff7c0" opacity="0.65" />
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
