import { niceDate, dayDiff, argDate, getWeekDays } from "../config";

export default function WeekTab({ days, habits, today, dayOff, setDayOff, setTab }) {
  const weekDays = getWeekDays(argDate(dayOff));

  return (
    <div>
      <div style={{
        fontSize: 11, letterSpacing: "0.26em", color: "var(--red-b)",
        marginBottom: 16, fontWeight: 700, fontFamily: "'Cinzel', serif",
        textTransform: "uppercase", textShadow: "0 0 8px var(--red)",
      }}>
        Week of {niceDate(weekDays[0])}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {weekDays.map(day => {
          const x = days[day] || { checks: {}, tasks: [] };
          const dc = habits.filter(h => x.checks && x.checks[h.id]).length;
          const tc = (x.tasks || []).filter(t => t.done).length;
          const tt = (x.tasks || []).length;
          const tot = dc + tc;
          const mx = habits.length + tt;
          const p = mx > 0 ? Math.round(tot / mx * 100) : 0;
          const pf = p === 100 && mx > 0;
          const isToday = day === today;
          const future = day > today;
          const dayName = new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
          const dayNum = parseInt(day.split("-")[2]);

          return (
            <div
              key={day}
              className="task-row"
              style={{
                gap: 14,
                cursor: "pointer",
                opacity: future ? 0.5 : 1,
                background: pf ? "linear-gradient(90deg, rgba(28, 10, 16, 0.8), var(--item))" : "var(--item)",
                border: isToday ? "1px solid var(--red)" : "1px solid var(--brd)",
                boxShadow: pf ? "0 0 18px rgba(232, 16, 42, 0.18)" : "none",
              }}
              onClick={() => { setDayOff(dayDiff(day, today)); setTab("day"); }}
            >
              <div style={{ width: 44, textAlign: "center" }}>
                <div style={{
                  fontSize: 10, color: isToday ? "var(--red)" : "var(--t3)",
                  letterSpacing: "0.16em", fontWeight: 700, fontFamily: "'Cinzel', serif",
                  textTransform: "uppercase",
                }}>{dayName}</div>
                <div style={{
                  fontSize: 20, fontWeight: 700,
                  color: isToday ? "var(--red)" : pf ? "var(--red)" : "var(--t1)",
                  fontFamily: "'Oswald', sans-serif", lineHeight: 1.1,
                  textShadow: isToday || pf ? "0 0 8px var(--red)" : "none",
                }}>{dayNum}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ height: 5, background: "#1e1a24", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    background: pf ? "linear-gradient(90deg, var(--red), var(--red-b))" : "var(--red)",
                    boxShadow: "0 0 6px var(--red)",
                    borderRadius: 3, width: p + "%",
                    transition: "width 0.5s cubic-bezier(0.4, 1.2, 0.3, 1)",
                  }} />
                </div>
              </div>
              <div style={{
                fontSize: 13, color: pf ? "var(--red)" : "var(--t2)",
                fontWeight: 700, minWidth: 36, textAlign: "right",
                fontFamily: "'Oswald', sans-serif",
              }}>{p}%</div>
              {tt > 0 && (
                <div style={{ fontSize: 11, color: "var(--t3)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                  {tc}/{tt}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
