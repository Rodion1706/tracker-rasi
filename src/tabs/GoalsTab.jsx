import { useState } from "react";
import TabHeader from "../components/TabHeader";
import { GoalTicks } from "../components/ProgressTicks";

const QUARTERS = ["Q2", "Q3", "Q4"];
const inputStyle = { width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--brd)", color: "var(--t1)", fontSize: 14, outline: "none", padding: "5px 0", boxSizing: "border-box", fontFamily: "inherit" };

function EditForm({ form, setForm, onSave, onCancel, showDelete, onDelete }) {
  return (
    <div className="brute" style={{ borderColor: "var(--brd-on)" }}>
      <div className="brute-field">
        <div className="brute-field-l">Goal</div>
        <input value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="Goal text" autoFocus style={inputStyle} />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="brute-field-l">Current</div>
          <input type="number" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="brute-field-l">Target</div>
          <input type="number" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="brute-field-l">Unit</div>
          <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="videos, $" style={inputStyle} />
        </div>
      </div>
      <div className="brute-field-l">Quarter</div>
      <div className="chip-row" style={{ marginBottom: 14 }}>
        {QUARTERS.map(q => (
          <div key={q} className={`chip ${form.quarter === q ? "active" : ""}`} onClick={() => setForm({ ...form, quarter: q })} style={{ flex: 1, textAlign: "center" }}>{q}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div onClick={onSave} className="add-btn">SAVE</div>
          <div onClick={onCancel} style={{ padding: "11px 16px", color: "var(--t3)", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", fontFamily: "'Cinzel', serif" }}>CANCEL</div>
        </div>
        {showDelete && (
          <div onClick={onDelete} style={{ padding: "11px 16px", color: "#cc3333", cursor: "pointer", fontSize: 11, border: "1px solid rgba(204, 51, 51, 0.3)", borderRadius: 8, fontWeight: 700, letterSpacing: "0.14em" }}>DELETE</div>
        )}
      </div>
    </div>
  );
}

export default function GoalsTab({ goals, setGoals }) {
  const [editId, setEditId] = useState(null);
  const [val, setVal] = useState(0);
  const [fullEditId, setFullEditId] = useState(null);
  const [form, setForm] = useState({ text: "", target: 0, unit: "", quarter: "Q2", current: 0 });
  const [adding, setAdding] = useState(false);

  function saveProgress(id) {
    setGoals(goals.map(g => g.id === id ? { ...g, current: val } : g));
    setEditId(null);
  }
  function saveFullEdit(id) {
    if (!form.text.trim()) return;
    setGoals(goals.map(g => g.id === id ? {
      ...g,
      text: form.text.trim(),
      target: Number(form.target) || 0,
      unit: form.unit.trim(),
      quarter: form.quarter,
      current: Number(form.current) || 0,
    } : g));
    setFullEditId(null);
  }
  function delGoal(id) {
    if (!confirm("Delete this goal?")) return;
    setGoals(goals.filter(g => g.id !== id));
    setFullEditId(null);
  }
  function addGoal() {
    if (!form.text.trim()) return;
    const newGoal = {
      id: "g" + Date.now(),
      text: form.text.trim(),
      target: Number(form.target) || 0,
      unit: form.unit.trim() || "units",
      quarter: form.quarter,
      current: Number(form.current) || 0,
    };
    setGoals(goals.concat([newGoal]));
    setForm({ text: "", target: 0, unit: "", quarter: "Q2", current: 0 });
    setAdding(false);
  }
  function startFullEdit(g) {
    setFullEditId(g.id);
    setForm({ text: g.text, target: g.target, unit: g.unit, quarter: g.quarter, current: g.current });
  }
  function startAdd(q) {
    setAdding(true); setFullEditId(null); setEditId(null);
    setForm({ text: "", target: 0, unit: "", quarter: q || "Q2", current: 0 });
  }

  const complete = goals.filter(g => g.target > 0 && g.current >= g.target).length;

  return (
    <div>
      <TabHeader title="Goals · 2026" subtitle={`${complete}/${goals.length} complete`} />

      {QUARTERS.map(q => {
        const qGoals = goals.filter(g => g.quarter === q);
        return (
          <div key={q} style={{ marginBottom: 26 }}>
            <div className="section">
              <div className="section-bar" />
              <span className="section-label">{q} · 2026</span>
              <div className="section-line" />
              <div onClick={() => startAdd(q)} style={{
                fontSize: 10, color: "var(--red)", cursor: "pointer",
                letterSpacing: "0.18em", fontWeight: 700, fontFamily: "'Cinzel', serif",
                padding: "4px 8px", borderRadius: 5, border: "1px solid rgba(232,16,42,0.3)",
                background: "rgba(232,16,42,0.08)", textShadow: "0 0 6px var(--red)",
              }}>+ ADD</div>
            </div>

            {qGoals.map((g, idx) => {
              if (fullEditId === g.id) return (
                <EditForm key={g.id}
                  form={form} setForm={setForm}
                  onSave={() => saveFullEdit(g.id)}
                  onCancel={() => setFullEditId(null)}
                  showDelete
                  onDelete={() => delGoal(g.id)}
                />
              );
              const p = g.target > 0 ? Math.min(100, Math.round(g.current / g.target * 100)) : 0;
              const done = p >= 100;
              return (
                <div key={g.id} className={`goal-row ${done ? "complete" : ""}`}
                  style={{ animationDelay: `${idx * 0.05}s`, animation: "fadeIn 0.4s ease-out both" }}>
                  <div className="goal-top">
                    <span className="goal-text">{g.text}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {editId === g.id ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="number" value={val} onChange={e => setVal(Number(e.target.value))} autoFocus
                            style={{ width: 70, background: "transparent", border: "none", borderBottom: "1px solid var(--brd-on)", color: "var(--t1)", fontSize: 14, outline: "none", textAlign: "right", fontFamily: "'Oswald', sans-serif", fontWeight: 700 }} />
                          <div onClick={() => saveProgress(g.id)} style={{ fontSize: 10, color: "var(--red)", cursor: "pointer", fontWeight: 700, letterSpacing: "0.14em", fontFamily: "'Cinzel', serif" }}>OK</div>
                        </div>
                      ) : (
                        <div onClick={() => { setEditId(g.id); setVal(g.current); }}
                          style={{ fontSize: 13, color: done ? "var(--red)" : "var(--t2)", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, textShadow: done ? "0 0 6px var(--red)" : "none", letterSpacing: "0.04em" }}>
                          {g.current}/{g.target} {g.unit}
                        </div>
                      )}
                      <div onClick={() => startFullEdit(g)} style={{ fontSize: 10, color: "var(--t3)", cursor: "pointer", fontFamily: "'Cinzel', serif", letterSpacing: "0.14em" }}>edit</div>
                    </div>
                  </div>
                  <GoalTicks current={g.current} target={g.target} />
                </div>
              );
            })}

            {adding && form.quarter === q && (
              <EditForm form={form} setForm={setForm} onSave={addGoal} onCancel={() => setAdding(false)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
