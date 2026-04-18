import { MONTHS, WDAYS, monthDays, monStart, dayDiff } from "../config";

export default function MonthTab({ days, habits, today, mOff, setMOff, setDayOff, setTab }) {
  const now = new Date();
  const vm = new Date(now.getFullYear(), now.getMonth() + mOff, 1);
  const mDays = monthDays(vm.getFullYear(), vm.getMonth());
  const fO = monStart(vm.getFullYear(), vm.getMonth());

  const past = mDays.filter(d => d <= today);
  const perf = past.filter(d => {
    const x = days[d];
    if (!x || !x.checks) return false;
    return habits.every(h => x.checks[h.id]);
  }).length;
  const actv = past.filter(d => {
    const x = days[d];
    if (!x) return false;
    return habits.some(h => x.checks && x.checks[h.id]);
  }).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div onClick={() => setMOff(mOff - 1)} style={{ fontSize: 22, color: "var(--red)", cursor: "pointer", padding: "4px 14px" }}>‹</div>
        <div style={{
          fontSize: 13, letterSpacing: "0.32em", color: "var(--t1)",
          fontWeight: 700, fontFamily: "'Oswald', sans-serif", textTransform: "uppercase",
          textShadow: "0 0 10px var(--red)",
        }}>
          {MONTHS[vm.getMonth()]} {vm.getFullYear()}
        </div>
        <div onClick={() => setMOff(mOff + 1)} style={{ fontSize: 22, color: "var(--red)", cursor: "pointer", padding: "4px 14px" }}>›</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
        {WDAYS.map((l, i) => (
          <div key={i} style={{
            textAlign: "center", fontSize: 10, color: "var(--t3)",
            padding: 4, fontWeight: 600, letterSpacing: "0.1em",
          }}>{l}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {Array.from({ length: fO }).map((_, i) => <div key={"e" + i} />)}
        {mDays.map(day => {
          const x = days[day] || {};
          const dc = x.checks ? habits.filter(h => x.checks[h.id]).length : 0;
          const tc = x.tasks ? x.tasks.filter(t => t.done).length : 0;
          const tt = x.tasks ? x.tasks.length : 0;
          const tot = dc + tc;
          const mx = habits.length + tt;
          const p = mx > 0 ? tot / mx : 0;
          const pf = p === 1 && mx > 0;
          const pt = p > 0 && !pf;
          const ht = tt > 0;
          const isToday = day === today;
          const future = day > today;
          const dn = parseInt(day.split("-")[2]);

          return (
            <div
              key={day}
              onClick={() => { setDayOff(dayDiff(day, today)); setTab("day"); }}
              style={{
                aspectRatio: "1", borderRadius: 7,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                background: pf
                  ? "linear-gradient(135deg, #2a1020, #1e0a10)"
                  : pt ? "#18121c" : "var(--item)",
                border: isToday ? "2px solid var(--red)" : "1px solid var(--brd)",
                opacity: future && !ht ? 0.35 : 1,
                boxShadow: pf ? "0 0 10px rgba(232, 16, 42, 0.3)" : "none",
                transition: "all 0.2s",
              }}
            >
              <div style={{
                fontSize: 13, color: pf ? "var(--red)" : pt ? "var(--t2)" : "#3a3440",
                fontWeight: isToday || pf ? 700 : 500,
                fontFamily: "'Oswald', sans-serif",
              }}>{dn}</div>
              {tot > 0 && !future && (
                <div style={{ fontSize: 8, color: pf ? "var(--red)" : "var(--t3)", marginTop: 1, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                  {Math.round(p * 100)}%
                </div>
              )}
              {future && ht && (
                <div style={{ width: 5, height: 5, borderRadius: 3, background: "rgba(232, 16, 42, 0.7)", marginTop: 2, boxShadow: "0 0 4px var(--red)" }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={{
        background: "var(--card)", borderRadius: 12, padding: "16px 18px", marginTop: 22,
        borderLeft: "3px solid var(--red)", boxShadow: "0 0 12px rgba(232, 16, 42, 0.1)",
      }}>
        <div style={{
          fontSize: 10, color: "var(--t3)", letterSpacing: "0.3em",
          marginBottom: 12, fontWeight: 700, fontFamily: "'Cinzel', serif", textTransform: "uppercase",
        }}>Stats</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[
            [perf, "perfect", "var(--red)"],
            [actv, "tracked", "var(--t2)"],
            [past.length, "elapsed", "var(--t3)"],
          ].map(([val, label, color]) => (
            <div key={label}>
              <div style={{ fontSize: 22, fontWeight: 700, color, fontFamily: "'Oswald', sans-serif", lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 9, color: "var(--t3)", letterSpacing: "0.2em", marginTop: 4, fontWeight: 600, fontFamily: "'Cinzel', serif", textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
