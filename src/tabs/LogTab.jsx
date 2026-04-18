import { useState, useEffect } from "react";
import { getWeekId } from "../config";
import TabHeader from "../components/TabHeader";
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
      <TabHeader title="Weekly Log" subtitle={wk} />

      {!editing ? (
        <div>
          <div className="brute">
            <div className="brute-stats">
              {[
                [log.published || 0, "published", "var(--red)"],
                [`$${log.spent || 0}`, "spent", "var(--t2)"],
                [`$${log.revenue || 0}`, "revenue", "var(--red-b)"],
              ].map(([val, lbl, col]) => (
                <div key={lbl}>
                  <div className="brute-stat-v" style={{ color: col }}>{val}</div>
                  <div className="brute-stat-l">{lbl}</div>
                </div>
              ))}
            </div>
            {log.lesson && (
              <div className="brute-field">
                <div className="brute-field-l">Key lesson</div>
                <div className="brute-field-v">{log.lesson}</div>
              </div>
            )}
            {log.change && (
              <div className="brute-field">
                <div className="brute-field-l">Change next week</div>
                <div className="brute-field-v">{log.change}</div>
              </div>
            )}
          </div>
          <div
            onClick={() => { setEditing(true); setForm(log); }}
            style={{
              padding: "12px 0", textAlign: "center",
              color: "var(--red)", fontSize: 11, cursor: "pointer",
              letterSpacing: "0.28em", fontWeight: 700, fontFamily: "'Cinzel', serif",
              textShadow: "0 0 8px rgba(232, 16, 42, 0.4)",
            }}
          >
            ◆ EDIT THIS WEEK ◆
          </div>
        </div>
      ) : (
        <div className="brute" style={{ borderColor: "var(--brd-on)" }}>
          {[["published", "Videos published", "number"], ["spent", "$ spent on editors", "number"], ["revenue", "$ revenue", "number"]].map(f => (
            <div key={f[0]} className="brute-field">
              <div className="brute-field-l">{f[1]}</div>
              <input
                type={f[2]}
                value={form[f[0]] || ""}
                onChange={e => setForm(Object.assign({}, form, { [f[0]]: f[2] === "number" ? Number(e.target.value) : e.target.value }))}
                style={{ width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--brd)", color: "var(--t1)", fontSize: 16, outline: "none", padding: "6px 0", boxSizing: "border-box", fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}
              />
            </div>
          ))}
          {[["lesson", "Key lesson this week"], ["change", "One change for next week"]].map(f => (
            <div key={f[0]} className="brute-field">
              <div className="brute-field-l">{f[1]}</div>
              <textarea
                value={form[f[0]] || ""}
                onChange={e => setForm(Object.assign({}, form, { [f[0]]: e.target.value }))}
                rows={3}
                style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid var(--brd)", borderRadius: 8, color: "var(--t1)", fontSize: 13, outline: "none", padding: 12, resize: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5 }}
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <div onClick={saveLog} className="add-btn">SAVE</div>
            <div onClick={() => setEditing(false)} style={{ padding: "11px 18px", color: "var(--t3)", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", fontFamily: "'Cinzel', serif" }}>CANCEL</div>
          </div>
        </div>
      )}

      {sortedWeeks.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionHeader label="HISTORY" />
          {sortedWeeks.filter(w => w !== wk).slice(0, 8).map(w => {
            const l = logs[w];
            return (
              <div key={w} className="row" style={{ cursor: "default" }}>
                <div className="row-body" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--t1)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{w}</span>
                  <span style={{ fontSize: 11, color: "var(--t3)", fontFamily: "'JetBrains Mono', monospace" }}>
                    {l.published || 0} vids · ${l.revenue || 0}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
