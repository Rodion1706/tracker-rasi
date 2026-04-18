import { useState } from "react";

const QUARTERS = ["Q2", "Q3", "Q4"];
const inputStyle = { width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--brd)", color: "var(--t1)", fontSize: 14, outline: "none", padding: "4px 0", boxSizing: "border-box", fontFamily: "inherit" };

function EditForm({ form, setForm, onSave, onCancel, showDelete, onDelete }) {
  return (
    <div style={{ padding: 14, background: "var(--card)", borderRadius: 11, border: "1px solid var(--brd-on)", marginBottom: 5 }}>
      <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.18em", marginBottom: 5, fontWeight: 600 }}>GOAL</div>
      <input value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="Goal text" autoFocus style={{ ...inputStyle, marginBottom: 12 }} />
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.18em", marginBottom: 5, fontWeight: 600 }}>CURRENT</div>
          <input type="number" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.18em", marginBottom: 5, fontWeight: 600 }}>TARGET</div>
          <input type="number" value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.18em", marginBottom: 5, fontWeight: 600 }}>UNIT</div>
          <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="videos, $" style={{ ...inputStyle, fontSize: 13 }} />
        </div>
      </div>
      <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.18em", marginBottom: 5, fontWeight: 600 }}>QUARTER</div>
      <div className="chip-row" style={{ marginBottom: 14 }}>
        {QUARTERS.map(q => (
          <div key={q} className={`chip ${form.quarter === q ? "active" : ""}`} onClick={() => setForm({ ...form, quarter: q })} style={{ flex: 1, textAlign: "center" }}>{q}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div onClick={onSave} className="add-btn">SAVE</div>
          <div onClick={onCancel} style={{ padding: "11px 16px", color: "var(--t3)", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>CANCEL</div>
        </div>
        {showDelete && (
          <div onClick={onDelete} style={{ padding: "11px 16px", color: "#cc3333", cursor: "pointer", fontSize: 11, border: "1px solid rgba(204, 51, 51, 0.3)", borderRadius: 8, fontWeight: 700 }}>DELETE</div>
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

  return (
    <div>
      {QUARTERS.map(q => {
        const qGoals = goals.filter(g => g.quarter === q);
        return (
          <div key={q} style={{ marginBottom: 22 }}>
            <div className="section">
              <div className="section-bar" />
              <span className="section-label">{q} · 2026</span>
              <div className="section-line" />
              <div onClick={() => startAdd(q)} style={{ fontSize: 10, color: "var(--red)", cursor: "pointer", letterSpacing: "0.14em", fontWeight: 700 }}>+ ADD</div>
            </div>

            {qGoals.map(g => {
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
              return (
                <div key={g.id} style={{
                  padding: "14px 16px", background: "var(--item)", borderRadius: 10,
                  marginBottom: 6, border: "1px solid var(--brd)", transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                    <span style={{ fontSize: 14, color: "var(--t1)", flex: 1, fontWeight: 500 }}>{g.text}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {editId === g.id ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <input type="number" value={val} onChange={e => setVal(Number(e.target.value))} autoFocus
                            style={{ width: 68, background: "transparent", border: "none", borderBottom: "1px solid var(--brd-on)", color: "var(--t1)", fontSize: 13, outline: "none", textAlign: "right", fontFamily: "'Oswald', sans-serif", fontWeight: 600 }} />
                          <div onClick={() => saveProgress(g.id)} style={{ fontSize: 10, color: "var(--red)", cursor: "pointer", fontWeight: 700, letterSpacing: "0.1em" }}>OK</div>
                        </div>
                      ) : (
                        <div onClick={() => { setEditId(g.id); setVal(g.current); }}
                          style={{ fontSize: 12, color: p >= 100 ? "var(--red)" : "var(--t2)", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, textShadow: p >= 100 ? "0 0 6px var(--red)" : "none" }}>
                          {g.current}/{g.target} {g.unit}
                        </div>
                      )}
                      <div onClick={() => startFullEdit(g)} style={{ fontSize: 10, color: "var(--t3)", cursor: "pointer", fontFamily: "'Cinzel', serif", letterSpacing: "0.1em" }}>edit</div>
                    </div>
                  </div>
                  <div style={{ height: 5, background: "#1e1a24", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      background: p >= 100 ? "linear-gradient(90deg, var(--red), var(--red-b))" : "linear-gradient(90deg, var(--red-d), var(--red))",
                      boxShadow: "0 0 6px var(--red)",
                      borderRadius: 3, width: p + "%",
                      transition: "width 0.6s cubic-bezier(0.4, 1.2, 0.3, 1)",
                    }} />
                  </div>
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
