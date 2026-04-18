import { useState, useEffect } from "react";
import { getWeekId } from "../config";
import SectionHeader from "../components/SectionHeader";

const EMPTY_LOG = { videos: 0, lesson: "", change: "", published: 0, spent: 0, revenue: 0 };

export default function LogTab({ logs, setLogs, today }) {
  const wk = getWeekId(today);
  const log = logs[wk] || EMPTY_LOG;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(log);

  useEffect(() => {
    setForm(logs[wk] || EMPTY_LOG);
  }, [wk, logs]);

  function saveLog() {
    const nl = Object.assign({}, logs);
    nl[wk] = form;
    setLogs(nl);
    setEditing(false);
  }

  const sortedWeeks = Object.keys(logs).sort().reverse();

  return (
    <div>
      <SectionHeader label={`WEEKLY LOG — ${wk}`} />

      {!editing ? (
        <div>
          <div style={{ padding: 18, background: "var(--item)", borderRadius: 12, border: "1px solid var(--brd)", marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              {[
                [log.published || 0, "published", "var(--red)"],
                [`$${log.spent || 0}`, "spent", "var(--t2)"],
                [`$${log.revenue || 0}`, "revenue", "var(--red-b)"],
              ].map(([val, lbl, col]) => (
                <div key={lbl}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: col, fontFamily: "'Oswald', sans-serif", lineHeight: 1, textShadow: "0 0 8px " + col }}>{val}</div>
                  <div style={{ fontSize: 9, color: "var(--t3)", letterSpacing: "0.2em", marginTop: 4, fontWeight: 600, fontFamily: "'Cinzel', serif", textTransform: "uppercase" }}>{lbl}</div>
                </div>
              ))}
            </div>
            {log.lesson && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.18em", marginBottom: 5, fontWeight: 600 }}>KEY LESSON</div>
                <div style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.55 }}>{log.lesson}</div>
              </div>
            )}
            {log.change && (
              <div>
                <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.18em", marginBottom: 5, fontWeight: 600 }}>CHANGE NEXT WEEK</div>
                <div style={{ fontSize: 13, color: "var(--t1)", lineHeight: 1.55 }}>{log.change}</div>
              </div>
            )}
          </div>
          <div onClick={() => { setEditing(true); setForm(log); }}
            style={{ padding: "10px 0", textAlign: "center", color: "var(--red)", fontSize: 11, cursor: "pointer", letterSpacing: "0.24em", fontWeight: 700, fontFamily: "'Cinzel', serif" }}>
            EDIT THIS WEEK
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--item)", borderRadius: 12, padding: 16, border: "1px solid var(--brd-on)" }}>
          {[["published", "Videos published", "number"], ["spent", "$ spent on editors", "number"], ["revenue", "$ revenue", "number"]].map(f => (
            <div key={f[0]} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.18em", marginBottom: 5, fontWeight: 600 }}>{f[1]}</div>
              <input
                type={f[2]}
                value={form[f[0]] || ""}
                onChange={e => setForm(Object.assign({}, form, { [f[0]]: f[2] === "number" ? Number(e.target.value) : e.target.value }))}
                style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--brd)", color: "var(--t1)", fontSize: 15, outline: "none", padding: "4px 0", boxSizing: "border-box", fontFamily: "'Oswald', sans-serif", fontWeight: 600 }}
              />
            </div>
          ))}
          {[["lesson", "Key lesson this week"], ["change", "One change for next week"]].map(f => (
            <div key={f[0]} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.18em", marginBottom: 5, fontWeight: 600 }}>{f[1]}</div>
              <textarea
                value={form[f[0]] || ""}
                onChange={e => setForm(Object.assign({}, form, { [f[0]]: e.target.value }))}
                rows={2}
                style={{ width: "100%", background: "transparent", border: "1px solid var(--brd)", borderRadius: 8, color: "var(--t1)", fontSize: 13, outline: "none", padding: 10, resize: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 8 }}>
            <div onClick={saveLog} className="add-btn">SAVE</div>
            <div onClick={() => setEditing(false)} style={{ padding: "11px 16px", color: "var(--t3)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>CANCEL</div>
          </div>
        </div>
      )}

      {/* History */}
      {sortedWeeks.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.22em", marginBottom: 10, fontWeight: 700, fontFamily: "'Cinzel', serif", textTransform: "uppercase" }}>History</div>
          {sortedWeeks.filter(w => w !== wk).slice(0, 8).map(w => {
            const l = logs[w];
            return (
              <div key={w} style={{
                padding: "11px 16px", background: "var(--item)", borderRadius: 9, marginBottom: 4,
                border: "1px solid var(--brd)", display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 12, color: "var(--t2)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{w}</span>
                <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {l.published || 0} vids · ${l.revenue || 0}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
