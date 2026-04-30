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
  // Chubby teardrop — Duolingo / TikTok proportions. Width:height
  // ~ 1:1.15 instead of 1:1.5. Three layers swaying at non-divisible
  // durations (4.3s / 3.7s / 2.9s) so the combined motion never lines
  // up the same way twice.
  const gid = `fg-${tier.cls}`;
  const cid = `fc-${tier.cls}`;
  return (
    <div className={`flame flame-${tier.cls}`} aria-hidden>
      <svg viewBox="0 0 30 34" fill="none">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor="currentColor" stopOpacity="0.6" />
            <stop offset="40%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
          <radialGradient id={cid} cx="50%" cy="76%" r="58%">
            <stop offset="0%"  stopColor="#fffce8" stopOpacity="1" />
            <stop offset="50%" stopColor="#ffd24d" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ff8a1a" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Layer 1 — chubby teardrop body, wide bulb at base */}
        <path
          className="flame-outer"
          d="M15 2.5
             C 13.2 4.5 12.4 7 12.4 10
             C 11.6 13 7.5 15 5 19
             C 2.5 23 2.5 27.5 5.5 30
             C 8.5 32 11.5 32.5 15 32.5
             C 18.5 32.5 21.5 32 24.5 30
             C 27.5 27.5 27.5 23 25 19
             C 22.5 15 18.4 13 17.6 10
             C 17.6 7 16.8 4.5 15 2.5 Z"
          fill={`url(#${gid})`}
        />
        {/* Layer 2 — translucent inner shell */}
        <path
          className="flame-mid"
          d="M15 8.5
             C 13.5 11 11 14 10 18
             C 9 22 9.5 26 11.5 28.5
             C 13 30 14 30.5 15 30.5
             C 16 30.5 17 30 18.5 28.5
             C 20.5 26 21 22 20 18
             C 19 14 16.5 11 15 8.5 Z"
          fill="#fff5d4"
          opacity="0.42"
        />
        {/* Core — bright warm heart, sits low and wide */}
        <ellipse className="flame-core" cx="15" cy="24" rx="5.2" ry="6.6" fill={`url(#${cid})`} />
        {/* Tip — sliver at upper core */}
        <path className="flame-tip" d="M15 12 C 14.3 15 14.3 19 15 21 C 15.7 19 15.7 15 15 12 Z" fill="#fffce8" opacity="0.85" />
        {/* Sparks at irregular cycles */}
        <circle className="flame-spark flame-spark-1" cx="15"   cy="2.5" r="1"   fill="#fff5b8" />
        <circle className="flame-spark flame-spark-2" cx="11.5" cy="4"   r="0.7" fill="#fff5b8" />
        <circle className="flame-spark flame-spark-3" cx="18.5" cy="5"   r="0.6" fill="#fff5b8" />
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
