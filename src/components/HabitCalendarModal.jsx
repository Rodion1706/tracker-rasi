import { useState } from "react";
import { argDate, MONTHS, WDAYS, monthDays, monStart } from "../config";

export default function HabitCalendarModal({ habit, days, today, onClose }) {
  const [mOff, setMOff] = useState(0);
  const now = new Date();
  const vm = new Date(now.getFullYear(), now.getMonth() + mOff, 1);
  const mDays = monthDays(vm.getFullYear(), vm.getMonth());
  const fO = monStart(vm.getFullYear(), vm.getMonth());

  // Current streak
  let curStreak = 0;
  for (let i = 0; i < 365; i++) {
    const k = argDate(-i);
    const x = days[k];
    if (x && x.checks && x.checks[habit.id]) curStreak++;
    else break;
  }

  // Best streak + totals
  let bestStreak = 0, running = 0, totalDone = 0, totalTracked = 0;
  const allDates = Object.keys(days).sort();
  for (const kk of allDates) {
    const xx = days[kk];
    if (xx && xx.checks) {
      totalTracked++;
      if (xx.checks[habit.id]) {
        totalDone++;
        running++;
        if (running > bestStreak) bestStreak = running;
      } else {
        running = 0;
      }
    }
  }
  const compliance = totalTracked > 0 ? Math.round(totalDone / totalTracked * 100) : 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-close" onClick={onClose}>×</div>

        <div style={{ fontSize: 11, letterSpacing: "0.28em", color: "var(--red)", fontWeight: 700, marginBottom: 6, fontFamily: "'Cinzel', serif", textTransform: "uppercase" }}>
          Habit
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--t1)", marginBottom: 2, fontFamily: "'Oswald', sans-serif", letterSpacing: "0.04em" }}>
          {habit.text}
        </div>
        {habit.sub && <div style={{ fontSize: 11, color: "var(--t3)", marginBottom: 18 }}>{habit.sub}</div>}

        {/* 4 stat tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            ["STREAK", curStreak, curStreak > 0 ? "var(--red)" : "var(--t3)"],
            ["BEST", bestStreak, bestStreak > 0 ? "var(--red)" : "var(--t3)"],
            ["TOTAL", totalDone, "var(--t1)"],
            ["RATE", compliance + "%", compliance >= 80 ? "var(--red)" : "var(--t2)"],
          ].map(([label, value, color]) => (
            <div key={label} style={{
              padding: "11px 8px", borderRadius: 9, background: "var(--item)",
              border: "1px solid var(--brd)", textAlign: "center",
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'Oswald', sans-serif", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 9, color: "var(--t3)", letterSpacing: "0.18em", marginTop: 4, fontWeight: 600, fontFamily: "'Cinzel', serif" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Month nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div onClick={() => setMOff(mOff - 1)} style={{ fontSize: 20, color: "var(--red)", cursor: "pointer", padding: "4px 12px" }}>‹</div>
          <div style={{ fontSize: 12, letterSpacing: "0.28em", color: "var(--t1)", fontWeight: 700, fontFamily: "'Oswald', sans-serif" }}>
            {MONTHS[vm.getMonth()]} {vm.getFullYear()}
          </div>
          <div onClick={() => { if (mOff < 0) setMOff(mOff + 1); }} style={{
            fontSize: 20, color: mOff < 0 ? "var(--red)" : "var(--brd)",
            cursor: mOff < 0 ? "pointer" : "default", padding: "4px 12px",
          }}>›</div>
        </div>

        {/* Weekday labels */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 6 }}>
          {WDAYS.map((l, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 10, color: "var(--t3)", padding: 2, fontWeight: 600, letterSpacing: "0.1em" }}>{l}</div>
          ))}
        </div>

        {/* Calendar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
          {Array.from({ length: fO }).map((_, i) => <div key={"e" + i} />)}
          {mDays.map(day => {
            const x = days[day] || {};
            const done = x.checks && x.checks[habit.id];
            const hasData = x.checks && Object.keys(x.checks).length > 0;
            const isToday = day === today;
            const future = day > today;
            const dn = parseInt(day.split("-")[2]);
            return (
              <div key={day} style={{
                aspectRatio: "1",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: done
                  ? "linear-gradient(135deg, var(--red), var(--red))"
                  : hasData && !future ? "#1a1520" : "var(--item)",
                border: isToday ? "2px solid var(--red)" : "1px solid var(--brd)",
                opacity: future ? 0.3 : 1,
                boxShadow: done ? "0 0 10px rgba(232, 16, 42, 0.4)" : "none",
              }}>
                <div style={{
                  fontSize: 12,
                  color: done ? "#fff" : hasData && !future ? "var(--t2)" : "#3a3440",
                  fontWeight: done || isToday ? 700 : 500,
                  fontFamily: "'Oswald', sans-serif",
                }}>{dn}</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, padding: 12, borderLeft: "2px solid rgba(232, 16, 42, 0.3)", fontSize: 11, color: "var(--t3)", lineHeight: 1.6, background: "rgba(232, 16, 42, 0.03)" }}>
          Red = held · Dark = tracked but missed · Gray = no data
        </div>
      </div>
    </div>
  );
}
