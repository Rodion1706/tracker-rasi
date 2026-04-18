import { useState } from "react";
import { TAGS, TAG_COLORS, argDate } from "../config";
import SectionHeader from "../components/SectionHeader";

const DAY_LABELS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const inputStyle = { width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--brd)", color: "var(--t1)", fontSize: 14, outline: "none", padding: "4px 0", boxSizing: "border-box", fontFamily: "inherit" };

function tagClass(tag) {
  if (tag === "Work 1") return "work1";
  if (tag === "Work 2") return "work2";
  if (tag === "Channel") return "channel";
  if (tag === "Personal") return "personal";
  return "";
}

function ImportTasks({ setDay, getDayData, today, bulkSetDays }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  function parseDate(s) {
    s = s.trim().toLowerCase();
    if (s === "today") return today;
    if (s === "tomorrow") return argDate(1);
    if (s === "yesterday") return argDate(-1);
    const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
    if (dayMap[s] !== undefined) {
      const td = new Date(today + "T12:00:00");
      let diff = dayMap[s] - td.getDay();
      if (diff <= 0) diff += 7;
      const fut = new Date(td);
      fut.setDate(fut.getDate() + diff);
      return fut.toISOString().split("T")[0];
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
  }

  function doPreview() {
    setError("");
    const lines = text.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
    if (lines.length === 0) { setError("No tasks to parse"); return; }
    const parsed = [], errors = [];
    lines.forEach((line, idx) => {
      const parts = line.split("|").map(p => p.trim());
      if (parts.length < 2) { errors.push(`Line ${idx + 1}: need at least date | text`); return; }
      const date = parseDate(parts[0]);
      if (!date) { errors.push(`Line ${idx + 1}: bad date '${parts[0]}'`); return; }
      let tag = "", taskText = "";
      if (parts.length === 2) { taskText = parts[1]; }
      else if (parts.length >= 3) {
        if (TAGS.includes(parts[1])) { tag = parts[1]; taskText = parts.slice(2).join(" | "); }
        else { taskText = parts.slice(1).join(" | "); }
      }
      if (!taskText) { errors.push(`Line ${idx + 1}: empty task text`); return; }
      parsed.push({ date, tag, text: taskText });
    });
    if (errors.length) { setError(errors.join("\n")); return; }
    const grouped = {};
    parsed.forEach(p => { (grouped[p.date] = grouped[p.date] || []).push(p); });
    setPreview({ tasks: parsed, grouped, total: parsed.length });
  }

  function doImport() {
    if (!preview) return;
    const allUpdates = {};
    Object.keys(preview.grouped).forEach(date => {
      const dd = getDayData(date);
      const newTasks = (dd.tasks || []).slice();
      preview.grouped[date].forEach((p, i) => {
        newTasks.push({ id: Date.now() + "" + i + Math.floor(Math.random() * 1000), text: p.text, tag: p.tag, done: false });
      });
      allUpdates[date] = Object.assign({}, dd, { tasks: newTasks });
    });
    bulkSetDays(allUpdates);
    setText(""); setPreview(null); setError("");
    alert(`Imported ${preview.total} tasks`);
  }

  const exampleText = `# Format: DATE | TAG (optional) | TASK
# Dates: YYYY-MM-DD, today, tomorrow, monday, tuesday...
# Tags: Work 1, Work 2, Channel, Personal

2026-04-20 | Channel | Red Team cat niche
tomorrow | Work 1 | Review Ars brief
friday | Personal | Dentist follow-up`;

  return (
    <div style={{ marginTop: 22 }}>
      <SectionHeader label="IMPORT TASKS" />
      <div style={{ padding: 14, background: "var(--item)", borderRadius: 11, border: "1px solid var(--brd)", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.6, marginBottom: 10 }}>
          Paste list: <span style={{ color: "var(--t2)" }}>DATE | TAG | TASK</span> per line. Tag optional.<br />
          Dates: <span style={{ color: "var(--t2)" }}>YYYY-MM-DD, today, tomorrow, monday..sunday</span>.
        </div>
        <textarea value={text} onChange={e => { setText(e.target.value); setPreview(null); setError(""); }} rows={8} placeholder={exampleText}
          style={{ width: "100%", background: "var(--card)", border: "1px solid var(--brd)", borderRadius: 8, color: "var(--t1)", fontSize: 12, outline: "none", padding: 10, resize: "vertical", boxSizing: "border-box", fontFamily: "'JetBrains Mono', monospace" }} />
        {error && (
          <div style={{ marginTop: 10, padding: 10, background: "#2a1010", borderRadius: 7, color: "#cc3333", fontSize: 11, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace" }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <div onClick={doPreview} className="add-btn">PREVIEW</div>
          {preview && <div onClick={doImport} className="add-btn" style={{ background: "rgba(255, 77, 109, 0.15)", color: "var(--red-b)", borderColor: "rgba(255, 77, 109, 0.4)" }}>IMPORT {preview.total}</div>}
          {(text || preview) && <div onClick={() => { setText(""); setPreview(null); setError(""); }} style={{ padding: "11px 14px", color: "var(--t3)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>CLEAR</div>}
        </div>
      </div>

      {preview && (
        <div style={{ padding: 14, background: "var(--card)", borderRadius: 11, border: "1px solid var(--brd-on)", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.24em", marginBottom: 10, fontWeight: 600 }}>
            PREVIEW — {preview.total} tasks across {Object.keys(preview.grouped).length} days
          </div>
          {Object.keys(preview.grouped).sort().map(date => (
            <div key={date} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--red)", fontWeight: 700, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                {date} ({preview.grouped[date].length})
              </div>
              {preview.grouped[date].map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--t2)", padding: "3px 0 3px 14px", borderLeft: "1px solid var(--brd)", marginLeft: 4, display: "flex", gap: 8 }}>
                  {p.tag && <span className={`task-tag ${tagClass(p.tag)}`} style={{ fontSize: 8, padding: "1px 6px" }}>{p.tag}</span>}
                  <span>{p.text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsTab({ habits, setHabits, recurring, setRecurring, data, setDay, getDayData, today, bulkSetDays }) {
  const [newH, setNewH] = useState("");
  const [newHS, setNewHS] = useState("");
  const [eId, setEId] = useState(null);
  const [eT, setET] = useState("");
  const [eS, setES] = useState("");
  const [newR, setNewR] = useState("");
  const [newRTag, setNewRTag] = useState("");
  const [newRDays, setNewRDays] = useState([]);

  function addH() {
    if (!newH.trim()) return;
    setHabits(habits.concat([{ id: "h" + Date.now(), text: newH.trim(), sub: newHS.trim() }]));
    setNewH(""); setNewHS("");
  }
  function delH(id) { setHabits(habits.filter(h => h.id !== id)); }
  function saveE() {
    if (!eT.trim()) return;
    setHabits(habits.map(h => h.id === eId ? { ...h, text: eT.trim(), sub: eS.trim() } : h));
    setEId(null);
  }
  function addR() {
    if (!newR.trim() || newRDays.length === 0) return;
    setRecurring(recurring.concat([{ id: "r" + Date.now(), text: newR.trim(), tag: newRTag, days: newRDays }]));
    setNewR(""); setNewRTag(""); setNewRDays([]);
  }
  function delR(id) { setRecurring(recurring.filter(r => r.id !== id)); }
  function toggleRDay(d) { setNewRDays(newRDays.includes(d) ? newRDays.filter(x => x !== d) : newRDays.concat([d])); }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "command-center-backup-" + argDate(0) + ".json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <SectionHeader label="HABITS" />
      {habits.map(h => {
        if (eId === h.id) return (
          <div key={h.id} style={{ padding: 14, background: "var(--item)", borderRadius: 11, marginBottom: 5, border: "1px solid var(--brd-on)" }}>
            <input value={eT} onChange={e => setET(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
            <input value={eS} onChange={e => setES(e.target.value)} placeholder="Subtitle" style={{ ...inputStyle, fontSize: 11, color: "var(--t2)", marginBottom: 10 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <div onClick={saveE} className="add-btn">SAVE</div>
              <div onClick={() => setEId(null)} style={{ padding: "11px 16px", color: "var(--t3)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>CANCEL</div>
            </div>
          </div>
        );
        return (
          <div key={h.id} style={{ display: "flex", alignItems: "center", padding: "12px 16px", background: "var(--item)", borderRadius: 11, marginBottom: 4, border: "1px solid var(--brd)", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>{h.text}</div>
              {h.sub && <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{h.sub}</div>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div onClick={() => { setEId(h.id); setET(h.text); setES(h.sub || ""); }} style={{ fontSize: 11, color: "var(--t2)", cursor: "pointer", fontFamily: "'Cinzel', serif" }}>edit</div>
              <div onClick={() => delH(h.id)} style={{ fontSize: 16, color: "var(--t3)", cursor: "pointer", lineHeight: 1 }}>×</div>
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 10, padding: 14, background: "var(--item)", borderRadius: 11, border: "1px solid var(--brd)" }}>
        <input value={newH} onChange={e => setNewH(e.target.value)} placeholder="New habit" onKeyDown={e => { if (e.key === "Enter") addH(); }}
          style={{ ...inputStyle, marginBottom: 8 }} />
        <input value={newHS} onChange={e => setNewHS(e.target.value)} placeholder="Subtitle (optional)"
          style={{ ...inputStyle, fontSize: 11, color: "var(--t2)", marginBottom: 10 }} />
        <div onClick={addH} className="add-btn" style={{ display: "inline-flex" }}>ADD HABIT</div>
      </div>

      <div style={{ marginTop: 26 }}>
        <SectionHeader label="RECURRING TASKS" />
      </div>
      {recurring.map(r => (
        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", background: "var(--item)", borderRadius: 11, marginBottom: 4, border: "1px solid var(--brd)", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>{r.text}</div>
            <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>
              {r.days.join(", ")}{r.tag ? " · " + r.tag : ""}
            </div>
          </div>
          <div onClick={() => delR(r.id)} style={{ fontSize: 16, color: "var(--t3)", cursor: "pointer", lineHeight: 1 }}>×</div>
        </div>
      ))}
      <div style={{ marginTop: 10, padding: 14, background: "var(--item)", borderRadius: 11, border: "1px solid var(--brd)" }}>
        <input value={newR} onChange={e => setNewR(e.target.value)} placeholder="Task text" style={{ ...inputStyle, marginBottom: 10 }} />
        <div className="chip-row" style={{ marginBottom: 10 }}>
          {DAY_LABELS.map(d => (
            <div key={d} className={`chip ${newRDays.includes(d) ? "active" : ""}`} onClick={() => toggleRDay(d)}>{d}</div>
          ))}
        </div>
        <div className="chip-row" style={{ marginBottom: 10 }}>
          {TAGS.map(t => (
            <div key={t} className={`chip ${tagClass(t)} ${newRTag === t ? "active" : ""}`} onClick={() => setNewRTag(newRTag === t ? "" : t)}>{t}</div>
          ))}
        </div>
        <div onClick={addR} className="add-btn" style={{ display: "inline-flex" }}>ADD RECURRING</div>
      </div>

      <ImportTasks setDay={setDay} getDayData={getDayData} today={today} bulkSetDays={bulkSetDays} />

      <div style={{ marginTop: 26 }}>
        <SectionHeader label="DATA" />
      </div>
      <div onClick={exportData} style={{ padding: "13px 16px", background: "var(--item)", borderRadius: 11, border: "1px solid var(--brd)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s" }}>
        <span style={{ fontSize: 13, color: "var(--t1)", fontWeight: 500 }}>Export backup (JSON)</span>
        <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 700, letterSpacing: "0.14em" }}>DOWNLOAD</span>
      </div>
      <div style={{ marginTop: 14, padding: 14, borderLeft: "2px solid rgba(232, 16, 42, 0.3)", background: "rgba(232, 16, 42, 0.03)" }}>
        <div style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.7 }}>
          Changes to habits apply to future days. Past data stays intact.
        </div>
      </div>
    </div>
  );
}
