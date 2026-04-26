import { niceDate, dayDiff, argDate, getWeekDays } from "../config";
import { WeekBigStrip } from "../components/StatCards";
import { activeHabitsOn } from "../gamification";

function tagClass(tag) {
  if (tag === "Work 1") return "work1";
  if (tag === "Work 2") return "work2";
  if (tag === "Channel") return "channel";
  if (tag === "Personal") return "personal";
  return "";
}

export default function WeekTab({ days, habits, today, dayOff, setDayOff, setTab }) {
  const weekDays = getWeekDays(argDate(dayOff));

  return (
    <div>
      {/* Big week strip — matches YearStrip style */}
      <WeekBigStrip weekDays={weekDays} today={today} habits={habits} days={days} />

      <div style={{
        fontSize: 11, letterSpacing: "0.26em", color: "var(--red)",
        marginBottom: 14, fontWeight: 700, fontFamily: "'Cinzel', serif",
        textTransform: "uppercase", textShadow: "0 0 8px var(--red)",
      }}>
        Week of {niceDate(weekDays[0])}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        {weekDays.map(day => {
          const x = days[day] || { checks: {}, tasks: [] };
          const dayHabits = activeHabitsOn(habits, day);
          const dc = dayHabits.filter(h => x.checks && x.checks[h.id]).length;
          const tc = (x.tasks || []).filter(t => t.done).length;
          const tt = (x.tasks || []).length;
          const tot = dc + tc;
          const mx = dayHabits.length + tt;
          const p = mx > 0 ? Math.round(tot / mx * 100) : 0;
          const pf = p === 100 && mx > 0;
          const isToday = day === today;
          const future = day > today;
          const dayName = new Date(day + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
          const dayNum = parseInt(day.split("-")[2]);

          // Build per-habit ticks + per-task ticks (tagged)
          const habitTicks = dayHabits.map(h => ({ done: !!(x.checks && x.checks[h.id]), kind: "h", tag: "" }));
          const taskTicks = (x.tasks || []).map(t => ({ done: !!t.done, kind: "t", tag: t.tag || "" }));
          const allTicks = [...habitTicks, ...taskTicks];

          return (
            <div
              key={day}
              className="wk-row"
              style={{
                borderColor: isToday ? "var(--red)" : "var(--brd)",
                background: pf ? "linear-gradient(90deg, rgba(28, 10, 16, 0.7), var(--item))" : "var(--item)",
                boxShadow: pf ? "0 0 18px rgba(232, 16, 42, 0.18)" : "none",
                opacity: future ? 0.5 : 1,
              }}
              onClick={() => { setDayOff(dayDiff(day, today)); setTab("day"); }}
            >
              <div className="wk-row-day">
                <div className="wk-row-name" style={{ color: isToday ? "var(--red)" : "var(--t3)" }}>{dayName}</div>
                <div className="wk-row-num" style={{
                  color: isToday ? "var(--red)" : pf ? "var(--red)" : "var(--t1)",
                  textShadow: isToday || pf ? "0 0 8px var(--red)" : "none",
                }}>{dayNum}</div>
              </div>

              <div className="wk-row-ticks">
                {allTicks.length === 0 ? (
                  <div className="wk-row-empty">—</div>
                ) : (
                  allTicks.map((t, i) => {
                    const tagCls = t.kind === "t" ? tagClass(t.tag) : "";
                    return (
                      <div
                        key={i}
                        className={`wk-tick ${t.done ? "done" : ""} ${t.kind === "t" ? "task" : "habit"} ${tagCls}`}
                        style={{ animationDelay: `${i * 0.015}s` }}
                      />
                    );
                  })
                )}
              </div>

              <div className="wk-row-pct" style={{ color: pf ? "var(--red)" : "var(--t2)" }}>
                {p}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
