import { MONTHS, WDAYS, monthDays, monStart, dayDiff } from "../config";
import TabHeader from "../components/TabHeader";
import { activeHabitsOn, isDayClean } from "../gamification";

export default function MonthTab({ days, habits, today, mOff, setMOff, setDayOff, setTab }) {
  const now = new Date();
  const vm = new Date(now.getFullYear(), now.getMonth() + mOff, 1);
  const mDays = monthDays(vm.getFullYear(), vm.getMonth());
  const fO = monStart(vm.getFullYear(), vm.getMonth());

  const past = mDays.filter(d => d <= today);
  const perf = past.filter(d => isDayClean(days[d], habits, d)).length;
  const actv = past.filter(d => {
    const x = days[d];
    if (!x) return false;
    return activeHabitsOn(habits, d).some(h => x.checks && x.checks[h.id]);
  }).length;

  return (
    <div>
      <TabHeader
        title={`${MONTHS[vm.getMonth()]} ${vm.getFullYear()}`}
        subtitle={`Month view · ${perf}/${past.length} clean days`}
      />

      <div className="month-nav">
        <div onClick={() => setMOff(mOff - 1)} className="day-nav-arrow">‹</div>
        <div className="month-nav-title">
          {MONTHS[vm.getMonth()]} {vm.getFullYear()}
        </div>
        <div onClick={() => setMOff(mOff + 1)} className="day-nav-arrow">›</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
        {WDAYS.map((l, i) => (
          <div key={i} className="month-weekday">{l}</div>
        ))}
      </div>

      <div className="month-grid">
        {Array.from({ length: fO }).map((_, i) => <div key={"e" + i} />)}
        {mDays.map((day, idx) => {
          const x = days[day] || {};
          const dayHabits = activeHabitsOn(habits, day);
          const dc = x.checks ? dayHabits.filter(h => x.checks[h.id]).length : 0;
          const tc = x.tasks ? x.tasks.filter(t => t.done).length : 0;
          const tt = x.tasks ? x.tasks.length : 0;
          const tot = dc + tc;
          const mx = dayHabits.length + tt;
          const p = mx > 0 ? tot / mx : 0;
          const pf = p === 1 && mx > 0;
          const pt = p > 0 && !pf;
          const ht = tt > 0;
          const isToday = day === today;
          const future = day > today;
          const dn = parseInt(day.split("-")[2]);

          const cls = [
            "month-cell",
            pf ? "perfect" : "",
            pt && !pf ? "partial" : "",
            isToday ? "today" : "",
            future && !ht ? "future" : "",
          ].filter(Boolean).join(" ");

          return (
            <div
              key={day}
              className={cls}
              style={{ animationDelay: `${idx * 0.012}s` }}
              onClick={() => { setDayOff(dayDiff(day, today)); setTab("day"); }}
            >
              {p > 0 && !future && (
                <div className="mc-fill" style={{ "--p": p }} />
              )}
              <div className="month-cell-num">{dn}</div>
              {tot > 0 && !future && (
                <div className="month-cell-pct">{Math.round(p * 100)}%</div>
              )}
              {future && ht && <div className="month-cell-future-dot" />}
            </div>
          );
        })}
      </div>

      <div className="month-stats">
        <div style={{
          fontSize: 10, color: "var(--t3)", letterSpacing: "0.28em",
          marginBottom: 12, fontWeight: 700, fontFamily: "'Cinzel', serif", textTransform: "uppercase",
        }}>Stats · {MONTHS[vm.getMonth()]}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[
            [perf, "perfect", "var(--red)"],
            [actv, "tracked", "var(--t2)"],
            [past.length, "elapsed", "var(--t3)"],
          ].map(([val, label, color]) => (
            <div key={label}>
              <div className="brute-stat-v" style={{ color }}>{val}</div>
              <div className="brute-stat-l">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
