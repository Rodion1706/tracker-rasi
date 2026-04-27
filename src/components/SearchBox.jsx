// Search across all days (tasks) + all logs.
// Returns ranked text matches with date + snippet. Click → jump to that day.

import { useState, useMemo } from "react";
import { findTag, tagPillStyle } from "../config";

export default function SearchBox({ days, logs, onJump, tags }) {
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!ql) return [];
    const out = [];
    // Tasks
    for (const dateKey of Object.keys(days || {}).sort().reverse()) {
      const d = days[dateKey];
      if (!d || !d.tasks) continue;
      for (const t of d.tasks) {
        if (!t.text) continue;
        if (t.text.toLowerCase().includes(ql)) {
          out.push({
            kind: "task",
            date: dateKey,
            text: t.text,
            tag: t.tag,
            done: t.done,
            rollCount: t.rollCount || 0,
          });
        }
      }
    }
    // Logs
    for (const dateKey of Object.keys(logs || {}).sort().reverse()) {
      const l = logs[dateKey];
      if (!l) continue;
      const text = (typeof l === "string") ? l : (l.text || JSON.stringify(l));
      if (text.toLowerCase().includes(ql)) {
        out.push({ kind: "log", date: dateKey, text });
      }
    }
    return out.slice(0, 50);
  }, [ql, days, logs]);

  return (
    <div className="search-box">
      <div className="search-input-wrap">
        <span className="search-icon">⌕</span>
        <input
          type="text"
          className="search-input"
          placeholder="Search tasks and logs…"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        {q && <span className="search-clear" onClick={() => setQ("")}>×</span>}
      </div>
      {ql && (
        <div className="search-results">
          {results.length === 0 ? (
            <div className="search-empty">No matches for "{q}"</div>
          ) : (
            <div className="search-meta">{results.length} match{results.length > 1 ? "es" : ""}</div>
          )}
          {results.map((r, i) => (
            <div
              key={i}
              className={`search-result ${r.done ? "done" : ""}`}
              onClick={() => onJump && onJump(r.date)}
            >
              <div className="search-result-date">{r.date} · {r.kind === "task" ? "TASK" : "LOG"}</div>
              <div className="search-result-text">{r.text}</div>
              <div className="search-result-meta">
                {r.kind === "task" && r.tag && (() => {
                  const tagObj = findTag(r.tag, tags || []);
                  const c = tagObj ? tagObj.color : null;
                  return <span className={`row-tag ${c ? "" : "orphan"}`} style={tagPillStyle(c)}>{r.tag}</span>;
                })()}
                {r.kind === "task" && r.rollCount > 0 && <span className="search-result-roll">↻{r.rollCount}</span>}
                {r.kind === "task" && r.done && <span className="search-result-done">DONE</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
