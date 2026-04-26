import { useState } from "react";
import { TAGS, argDate } from "../config";
import TabHeader from "../components/TabHeader";
import SectionHeader from "../components/SectionHeader";
import BadgeWall from "../components/BadgeWall";
import LevelBar from "../components/LevelBar";
import SearchBox from "../components/SearchBox";
import NotificationSettings from "../components/NotificationSettings";
import { isSoundOn, setSoundOn, playTick, SOUND_PACKS, getSoundPack, setSoundPack } from "../sound";
import { DEFAULT_BANNER_LINES } from "../components/Celebration";

const DAY_LABELS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const inputStyle = { width: "100%", background: "transparent", border: "none", borderBottom: "1px solid var(--brd)", color: "var(--t1)", fontSize: 14, outline: "none", padding: "5px 0", boxSizing: "border-box", fontFamily: "inherit" };

function tagClass(tag) {
  if (tag === "Work 1") return "work1";
  if (tag === "Work 2") return "work2";
  if (tag === "Channel") return "channel";
  if (tag === "Personal") return "personal";
  return "";
}

function HardModeToggle({ on, setOn }) {
  if (!setOn) return null;
  return (
    <div className="sound-toggle" onClick={() => setOn(!on)}>
      <div className={`sound-toggle-sw ${on ? "on" : ""}`}>
        <div className="sound-toggle-knob" />
      </div>
      <div>
        <div className="sound-toggle-label">HARD MODE</div>
        <div className="sound-toggle-sub">
          {on
            ? "Tasks rolled 5+ times get auto-dropped. No mercy."
            : "Off — tasks roll forever, just look angrier."}
        </div>
      </div>
    </div>
  );
}

function StrictStreakToggle({ on, setOn }) {
  if (!setOn) return null;
  return (
    <div className="sound-toggle" onClick={() => setOn(!on)}>
      <div className={`sound-toggle-sw ${on ? "on" : ""}`}>
        <div className="sound-toggle-knob" />
      </div>
      <div>
        <div className="sound-toggle-label">STRICT STREAK</div>
        <div className="sound-toggle-sub">
          {on
            ? "Clean = every habit AND every task done. No half-credit."
            : "Off — clean = every habit done (tasks don't matter)."}
        </div>
      </div>
    </div>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(isSoundOn());
  const [pack, setPack] = useState(getSoundPack());
  function flip() {
    const next = !on;
    setSoundOn(next);
    setOn(next);
    if (next) playTick();
  }
  function pickPack(id) {
    setSoundPack(id);
    setPack(id);
    playTick(id); // preview
  }
  return (
    <div className="sound-block">
      <div className="sound-toggle" onClick={flip}>
        <div className={`sound-toggle-sw ${on ? "on" : ""}`}>
          <div className="sound-toggle-knob" />
        </div>
        <div>
          <div className="sound-toggle-label">CHECK SOUND</div>
          <div className="sound-toggle-sub">{on ? "On — tap a pack to preview" : "Off"}</div>
        </div>
      </div>
      {on && (
        <div className="sound-packs">
          {SOUND_PACKS.map(p => (
            <div
              key={p.id}
              className={`sound-pack ${pack === p.id ? "on" : ""}`}
              onClick={() => pickPack(p.id)}
            >
              <div className="sound-pack-name">{p.name}</div>
              <div className="sound-pack-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BannerEditor({ phrases, setPhrases }) {
  const list = (phrases && phrases.length > 0) ? phrases : DEFAULT_BANNER_LINES;
  const [draft, setDraft] = useState("");

  function update(idx, val) {
    const next = list.slice();
    next[idx] = val;
    setPhrases(next);
  }
  function remove(idx) {
    if (list.length <= 1) return; // keep at least one
    setPhrases(list.filter((_, i) => i !== idx));
  }
  function add() {
    const v = draft.trim();
    if (!v) return;
    setPhrases(list.concat([v.toUpperCase()]));
    setDraft("");
  }
  function reset() {
    setPhrases(DEFAULT_BANNER_LINES.slice());
  }

  return (
    <div className="banner-editor">
      <div className="banner-editor-head">
        <div>
          <div className="banner-editor-label">CUSTOM BANNERS</div>
          <div className="banner-editor-sub">Phrases that pop on day close — rotates per close. Default tier 1 only; week/month tiers stay locked.</div>
        </div>
        <div className="banner-editor-reset" onClick={reset}>RESET</div>
      </div>
      <div className="banner-editor-list">
        {list.map((p, i) => (
          <div key={i} className="banner-editor-row">
            <input
              type="text"
              className="banner-editor-input"
              value={p}
              onChange={e => update(i, e.target.value.toUpperCase())}
              maxLength={28}
            />
            <div className="banner-editor-del" onClick={() => remove(i)} title="Remove">×</div>
          </div>
        ))}
      </div>
      <div className="banner-editor-add">
        <input
          type="text"
          className="banner-editor-input"
          placeholder="ADD A NEW PHRASE…"
          value={draft}
          onChange={e => setDraft(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === "Enter") add(); }}
          maxLength={28}
        />
        <div className="banner-editor-addbtn" onClick={add}>+ ADD</div>
      </div>
    </div>
  );
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
# Dates: YYYY-MM-DD, today, tomorrow, monday..sunday
# Tags: Work 1, Work 2, Channel, Personal

2026-04-20 | Channel | Red Team cat niche
tomorrow | Work 1 | Review Ars brief
friday | Personal | Dentist follow-up`;

  return (
    <div style={{ marginTop: 24 }}>
      <SectionHeader label="IMPORT TASKS" />
      <div className="brute">
        <div style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.7, marginBottom: 12 }}>
          Paste list: <span style={{ color: "var(--t1)", fontFamily: "'JetBrains Mono', monospace" }}>DATE | TAG | TASK</span> per line. Tag optional.<br />
          Dates: <span style={{ color: "var(--t1)", fontFamily: "'JetBrains Mono', monospace" }}>YYYY-MM-DD, today, tomorrow, monday..sunday</span>.
        </div>
        <textarea value={text} onChange={e => { setText(e.target.value); setPreview(null); setError(""); }} rows={8} placeholder={exampleText}
          style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid var(--brd)", borderRadius: 8, color: "var(--t1)", fontSize: 12, outline: "none", padding: 12, resize: "vertical", boxSizing: "border-box", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.55 }} />
        {error && (
          <div style={{ marginTop: 10, padding: 10, background: "rgba(204, 51, 51, 0.15)", border: "1px solid rgba(204, 51, 51, 0.4)", borderRadius: 8, color: "#ff6070", fontSize: 11, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace" }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <div onClick={doPreview} className="add-btn">PREVIEW</div>
          {preview && <div onClick={doImport} className="add-btn" style={{ background: "rgba(232, 16, 42, 0.2)", color: "var(--red)", borderColor: "rgba(232, 16, 42, 0.5)" }}>IMPORT {preview.total}</div>}
          {(text || preview) && <div onClick={() => { setText(""); setPreview(null); setError(""); }} style={{ padding: "11px 16px", color: "var(--t3)", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", fontFamily: "'Cinzel', serif" }}>CLEAR</div>}
        </div>
      </div>

      {preview && (
        <div className="brute" style={{ borderColor: "var(--brd-on)", marginTop: 10 }}>
          <div style={{ fontSize: 10, color: "var(--t3)", letterSpacing: "0.26em", marginBottom: 12, fontWeight: 700, fontFamily: "'Cinzel', serif", textTransform: "uppercase" }}>
            Preview — {preview.total} tasks across {Object.keys(preview.grouped).length} days
          </div>
          {Object.keys(preview.grouped).sort().map(date => (
            <div key={date} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "var(--red)", fontWeight: 700, marginBottom: 7, fontFamily: "'JetBrains Mono', monospace" }}>
                {date} ({preview.grouped[date].length})
              </div>
              {preview.grouped[date].map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--t2)", padding: "4px 0 4px 14px", borderLeft: "1px solid rgba(232, 16, 42, 0.25)", marginLeft: 4, display: "flex", gap: 8, alignItems: "center" }}>
                  {p.tag && <span className={`row-tag ${tagClass(p.tag)}`} style={{ fontSize: 8, padding: "2px 7px" }}>{p.tag}</span>}
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

export default function SettingsTab({ habits, setHabits, recurring, setRecurring, data, setDay, getDayData, today, bulkSetDays, badgeInfo, levelInfo, claimNextLevel, bannerPhrases, setBannerPhrases, hardModeOn, setHardModeOn, strictStreak, setStrictStreak, jumpToDay }) {
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
    // createdAt locks the habit to days >= today, so adding doesn't
    // retroactively change past completion.
    setHabits(habits.concat([{
      id: "h" + Date.now(),
      text: newH.trim(),
      sub: newHS.trim(),
      createdAt: today,
    }]));
    setNewH(""); setNewHS("");
  }
  // Soft-archive: keep the habit in the list but stamp archivedAt so it
  // stops applying to days >= today. Past clean days remain clean.
  function delH(id) {
    setHabits(habits.map(h => h.id === id ? Object.assign({}, h, { archivedAt: today }) : h));
  }
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

  // CSV: one row per item (habit or task) per day. Easy to pivot in Sheets.
  function exportCSV() {
    const rows = [
      ["date", "type", "id", "text", "tag", "done", "rollCount", "originalDate", "hardDay"],
    ];
    function esc(v) {
      if (v === undefined || v === null) return "";
      const s = String(v);
      if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
        return "\"" + s.replace(/"/g, "\"\"") + "\"";
      }
      return s;
    }
    const days = data.days || {};
    const habitMap = new Map((habits || []).map(h => [h.id, h]));
    for (const dateKey of Object.keys(days).sort()) {
      const d = days[dateKey];
      if (!d) continue;
      const hardDay = d.hardDay ? "1" : "";
      // Habits: emit one row per active-on-that-day habit, with done state
      if (d.checks) {
        for (const hid of Object.keys(d.checks)) {
          const h = habitMap.get(hid);
          rows.push([
            dateKey, "habit", hid,
            h ? h.text : "(deleted)",
            "",
            d.checks[hid] ? "1" : "0",
            "", "", hardDay,
          ]);
        }
      }
      // Tasks
      if (d.tasks) {
        for (const t of d.tasks) {
          rows.push([
            dateKey, "task", t.id || "",
            t.text || "",
            t.tag || "",
            t.done ? "1" : "0",
            String(t.rollCount || 0),
            t.originalDate || "",
            hardDay,
          ]);
        }
      }
    }
    const csv = rows.map(r => r.map(esc).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "command-center-" + argDate(0) + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <TabHeader title="Settings" subtitle={`${habits.filter(h => !h.archivedAt).length} habits · ${recurring.length} recurring`} />

      {/* Bulk task import — front and center for batch loading */}
      <ImportTasks setDay={setDay} getDayData={getDayData} today={today} bulkSetDays={bulkSetDays} />

      {/* Search across history */}
      <div style={{ marginTop: 22 }}>
        <SectionHeader label="SEARCH" />
      </div>
      <SearchBox days={data.days || {}} logs={data.logs || {}} onJump={jumpToDay} />

      {/* Habits — only show currently active ones (archived stay in the
          list invisibly so past days keep their snapshot semantics). */}
      <SectionHeader label="HABITS" count={habits.filter(h => !h.archivedAt).length} />
      {habits.filter(h => !h.archivedAt).map(h => {
        if (eId === h.id) return (
          <div key={h.id} className="brute" style={{ marginBottom: 5 }}>
            <div className="brute-field">
              <div className="brute-field-l">Habit</div>
              <input value={eT} onChange={e => setET(e.target.value)} style={inputStyle} autoFocus />
            </div>
            <div className="brute-field">
              <div className="brute-field-l">Subtitle</div>
              <input value={eS} onChange={e => setES(e.target.value)} placeholder="Optional" style={{ ...inputStyle, fontSize: 12 }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div onClick={saveE} className="add-btn">SAVE</div>
              <div onClick={() => setEId(null)} style={{ padding: "11px 16px", color: "var(--t3)", cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", fontFamily: "'Cinzel', serif" }}>CANCEL</div>
            </div>
          </div>
        );
        return (
          <div key={h.id} className="row" style={{ cursor: "default", gap: 10 }}>
            <div className="row-body">
              <div className="row-text">{h.text}</div>
              {h.sub && <div className="row-sub">{h.sub}</div>}
            </div>
            <div onClick={() => { setEId(h.id); setET(h.text); setES(h.sub || ""); }} style={{ fontSize: 11, color: "var(--t2)", cursor: "pointer", fontFamily: "'Cinzel', serif", letterSpacing: "0.14em", padding: "4px 10px" }}>edit</div>
            <div onClick={() => delH(h.id)} style={{ fontSize: 18, color: "var(--t3)", cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</div>
          </div>
        );
      })}
      <div className="brute" style={{ marginTop: 10 }}>
        <div className="brute-field">
          <div className="brute-field-l">New habit</div>
          <input value={newH} onChange={e => setNewH(e.target.value)} placeholder="e.g. Meditate 10 min" onKeyDown={e => { if (e.key === "Enter") addH(); }} style={inputStyle} />
        </div>
        <div className="brute-field">
          <div className="brute-field-l">Subtitle (optional)</div>
          <input value={newHS} onChange={e => setNewHS(e.target.value)} placeholder="e.g. Right after coffee" style={{ ...inputStyle, fontSize: 12 }} />
        </div>
        <div onClick={addH} className="add-btn" style={{ display: "inline-flex", marginTop: 4 }}>ADD HABIT</div>
      </div>

      {/* Recurring */}
      <div style={{ marginTop: 30 }}>
        <SectionHeader label="RECURRING TASKS" count={recurring.length} />
      </div>
      {recurring.map(r => (
        <div key={r.id} className="row" style={{ cursor: "default", gap: 10 }}>
          <div className="row-body">
            <div className="row-text">{r.text}</div>
            <div className="row-sub" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {r.days.join(" · ")}{r.tag ? " · " + r.tag : ""}
            </div>
          </div>
          <div onClick={() => delR(r.id)} style={{ fontSize: 18, color: "var(--t3)", cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</div>
        </div>
      ))}
      <div className="brute" style={{ marginTop: 10 }}>
        <div className="brute-field">
          <div className="brute-field-l">Task text</div>
          <input value={newR} onChange={e => setNewR(e.target.value)} placeholder="e.g. Review weekly metrics" style={inputStyle} />
        </div>
        <div className="brute-field-l">Days</div>
        <div className="chip-row" style={{ marginBottom: 14 }}>
          {DAY_LABELS.map(d => (
            <div key={d} className={`chip ${newRDays.includes(d) ? "active" : ""}`} onClick={() => toggleRDay(d)}>{d}</div>
          ))}
        </div>
        <div className="brute-field-l">Tag (optional)</div>
        <div className="chip-row" style={{ marginBottom: 14 }}>
          {TAGS.map(t => (
            <div key={t} className={`chip ${tagClass(t)} ${newRTag === t ? "active" : ""}`} onClick={() => setNewRTag(newRTag === t ? "" : t)}>{t}</div>
          ))}
        </div>
        <div onClick={addR} className="add-btn" style={{ display: "inline-flex" }}>ADD RECURRING</div>
      </div>

      {/* Personalization — moved to bottom per Boss preference */}
      <div style={{ marginTop: 30 }}>
        <SectionHeader label="PERSONALIZATION" />
      </div>

      {levelInfo && (
        <div style={{ marginBottom: 14 }}>
          <LevelBar levelInfo={levelInfo} onClaim={claimNextLevel} />
        </div>
      )}

      <StrictStreakToggle on={!!strictStreak} setOn={setStrictStreak} />

      <HardModeToggle on={!!hardModeOn} setOn={setHardModeOn} />

      <NotificationSettings />

      <SoundToggle />

      {setBannerPhrases && (
        <BannerEditor phrases={bannerPhrases} setPhrases={setBannerPhrases} />
      )}

      <div className="kbd-hint">
        <div className="kbd-hint-label">KEYBOARD · DESKTOP</div>
        <div className="kbd-hint-grid">
          <span><kbd>D</kbd> Day</span>
          <span><kbd>W</kbd> Week</span>
          <span><kbd>M</kbd> Month</span>
          <span><kbd>X</kbd> Stats</span>
          <span><kbd>L</kbd> Log</span>
          <span><kbd>G</kbd> Goals</span>
          <span><kbd>S</kbd> Settings</span>
          <span><kbd>T</kbd> Jump to today</span>
          <span><kbd>N</kbd> / <kbd>/</kbd> Focus add-task</span>
          <span><kbd>←</kbd> / <kbd>→</kbd> Prev/next day</span>
        </div>
      </div>

      {/* Export */}
      <div style={{ marginTop: 30 }}>
        <SectionHeader label="DATA" />
      </div>
      <div onClick={exportData} className="row" style={{ gap: 10, justifyContent: "space-between" }}>
        <div className="row-body">
          <div className="row-text">Export backup (JSON)</div>
          <div className="row-sub">Full snapshot — restore everything</div>
        </div>
        <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 700, letterSpacing: "0.18em", fontFamily: "'Cinzel', serif", textShadow: "0 0 6px var(--red)" }}>DOWNLOAD</span>
      </div>

      <div
        onClick={() => {
          if (!confirm("Clear ALL Hard Day marks across history? Past streaks will recompute as if no hard days were used.")) return;
          if (!data || !data.days) return;
          const cleared = {};
          for (const k of Object.keys(data.days)) {
            const d = data.days[k];
            if (d && d.hardDay) {
              cleared[k] = Object.assign({}, d, { hardDay: false });
            }
          }
          if (Object.keys(cleared).length > 0) bulkSetDays(cleared);
        }}
        className="row"
        style={{ gap: 10, justifyContent: "space-between", marginTop: 6 }}
      >
        <div className="row-body">
          <div className="row-text">Reset Hard Day marks</div>
          <div className="row-sub">Clear every past Hard Day toggle. Streaks recompute honestly.</div>
        </div>
        <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 700, letterSpacing: "0.18em", fontFamily: "'Cinzel', serif", textShadow: "0 0 6px var(--red)" }}>RESET</span>
      </div>
      <div onClick={exportCSV} className="row" style={{ gap: 10, justifyContent: "space-between", marginTop: 6 }}>
        <div className="row-body">
          <div className="row-text">Export CSV (spreadsheet)</div>
          <div className="row-sub">One row per task / habit per day. For analysis with Claude or Sheets.</div>
        </div>
        <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 700, letterSpacing: "0.18em", fontFamily: "'Cinzel', serif", textShadow: "0 0 6px var(--red)" }}>DOWNLOAD</span>
      </div>
      <div style={{ marginTop: 14, padding: "14px 18px", borderLeft: "3px solid var(--red)", background: "rgba(232, 16, 42, 0.04)", borderRadius: "0 10px 10px 0" }}>
        <div style={{ fontSize: 11, color: "var(--t3)", lineHeight: 1.7 }}>
          Changes to habits apply to future days. Past data stays intact.
        </div>
      </div>
    </div>
  );
}
