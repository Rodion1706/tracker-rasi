// Stat cards that sit above the daily progress bar.
// - Streak / Done — big gradient cards
// - Best / Week — smaller summary strip (tick-style to match YearStrip)

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
