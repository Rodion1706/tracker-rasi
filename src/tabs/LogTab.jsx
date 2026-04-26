// Weekly log — focused on reflection only.
// Boss: "убрать опубликованные видео, затраты на монтажера и т.д.
// Просто ключевые уроки и что изменю на следующей неделе".
// Old metrics fields (videos/published/spent/revenue) are no longer
// editable. Existing data on past weeks stays in storage but isn't
// shown — non-destructive.

import { useState, useEffect } from "react";
import { getWeekId } from "../config";
import TabHeader from "../components/TabHeader";
import SectionHeader from "../components/SectionHeader";

const EMPTY_LOG = { lesson: "", change: "" };

export default function LogTab({ logs, setLogs, today }) {
  const currentWk = getWeekId(today);
  const [viewWk, setViewWk] = useState(currentWk);
  const stored = logs[viewWk] || {};
  const log = { lesson: stored.lesson || "", change: stored.change || "" };
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(log);
  const wk = viewWk;
  const isCurrentWk = wk === currentWk;

  useEffect(() => {
    const cur = logs[wk] || {};
    setForm({ lesson: cur.lesson || "", change: cur.change || "" });
    setEditing(false);
  }, [wk, logs]);

  function saveLog() {
    const nl = Object.assign({}, logs);
    // Preserve any legacy fields on the saved entry, just update the
    // two reflection fields. Doesn't break old data.
    nl[wk] = Object.assign({}, logs[wk] || {}, {
      lesson: form.lesson,
      change: form.change,
    });
    setLogs(nl);
    setEditing(false);
  }

  const sortedWeeks = Object.keys(logs).sort().reverse();
  const hasContent = !!(log.lesson || log.change);

  return (
    <div>
      <TabHeader
        title={isCurrentWk ? "Weekly Log" : "Log · " + wk}
        subtitle={isCurrentWk ? wk : "viewing past week"}
      />

      {!isCurrentWk && (
        <div
          onClick={() => setViewWk(currentWk)}
          style={{
            padding: "10px 0", textAlign: "center",
            color: "var(--t2)", fontSize: 10, cursor: "pointer",
            letterSpacing: "0.22em", fontWeight: 700, fontFamily: "'Cinzel', serif",
            marginBottom: 10,
          }}
        >
          ◂ BACK TO CURRENT WEEK
        </div>
      )}

      {!editing ? (
        <div>
          <div className="brute">
            {hasContent ? (
              <>
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
              </>
            ) : (
              <div style={{ fontSize: 12, color: "var(--t3)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em", lineHeight: 1.6 }}>
                Nothing logged for this week yet. Two prompts: what was the key lesson, and one thing you'll change next week.
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
            ◆ {hasContent ? "EDIT" : "WRITE"} {isCurrentWk ? "THIS WEEK" : "THIS LOG"} ◆
          </div>
        </div>
      ) : (
        <div className="brute" style={{ borderColor: "var(--brd-on)" }}>
          {[
            ["lesson", "Key lesson this week"],
            ["change", "One change for next week"],
          ].map(f => (
            <div key={f[0]} className="brute-field">
              <div className="brute-field-l">{f[1]}</div>
              <textarea
                value={form[f[0]] || ""}
                onChange={e => setForm(Object.assign({}, form, { [f[0]]: e.target.value }))}
                rows={4}
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
          {sortedWeeks.filter(w => w !== wk).map(w => {
            const l = logs[w] || {};
            const preview = (l.lesson || l.change || "").trim().slice(0, 60);
            return (
              <div
                key={w}
                className="row"
                onClick={() => setViewWk(w)}
                title="Click to view & edit"
              >
                <div className="row-body">
                  <div style={{ fontSize: 13, color: "var(--t1)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{w}</div>
                  {preview && (
                    <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 3, lineHeight: 1.4 }}>
                      {preview}{preview.length === 60 ? "…" : ""}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
