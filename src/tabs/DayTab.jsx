import { useState, useEffect } from "react";
import { TAGS, QUOTES, argDate, niceDate, getWeekDays } from "../config";
import { RadialCheck, DiamondCheck } from "../components/Checks";
import SectionHeader from "../components/SectionHeader";
import { BigStat, BestStat, WeekStat } from "../components/StatCards";

function tagClass(tag) {
  if (tag === "Work 1") return "work1";
  if (tag === "Work 2") return "work2";
  if (tag === "Channel") return "channel";
  if (tag === "Personal") return "personal";
  return "";
}

export default function DayTab({
  days, habits, today, dayOff, setDayOff,
  setDay, getDayData, streak, bestStreak, recurring, openHabitModal,
}) {
  const [nt, setNt] = useState("");
  const [tag, setTag] = useState("");
  const [tgt, setTgt] = useState("this");
  const [pk, setPk] = useState("");
  const [spk, setSpk] = useState(false);
  const [eid, setEid] = useState(null);
  const [ev, setEv] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const viewDay = argDate(dayOff);
  const isToday = viewDay === today;
  const isFuture = viewDay > today;
  const dd = getDayData(viewDay);
  const ch = dd.checks;
  const tasks = dd.tasks;

  // Apply recurring tasks to today
  const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  const dayOfWeek = new Date(viewDay + "T12:00:00").getDay();
  const recToday = recurring.filter(r => r.days.includes(dayNames[dayOfWeek]));
  const recNotAdded = recToday.filter(r => !tasks.some(t => t.recId === r.id));

  function applyRecurring() {
    if (recNotAdded.length === 0) return;
    const newTasks = tasks.concat(recNotAdded.map(r => ({
      id: Date.now() + "-" + r.id,
      text: r.text,
      done: false,
      tag: r.tag || "",
      recId: r.id,
    })));
    setDay(viewDay, Object.assign({}, dd, { tasks: newTasks }));
  }
  useEffect(() => {
    if (isToday && recNotAdded.length > 0) applyRecurring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDay]);

  function toggleCheck(id) {
    const nc = Object.assign({}, ch);
    nc[id] = !nc[id];
    setDay(viewDay, Object.assign({}, dd, { checks: nc }));
  }
  function toggleTask(id) {
    setDay(viewDay, Object.assign({}, dd, {
      tasks: tasks.map(t => t.id === id ? Object.assign({}, t, { done: !t.done }) : t),
    }));
  }
  function delTask(id) {
    setDay(viewDay, Object.assign({}, dd, { tasks: tasks.filter(t => t.id !== id) }));
  }
  function saveEdit(id) {
    if (!ev.trim()) return;
    setDay(viewDay, Object.assign({}, dd, {
      tasks: tasks.map(t => t.id === id ? Object.assign({}, t, { text: ev.trim() }) : t),
    }));
    setEid(null);
  }
  function addTask() {
    if (!nt.trim()) return;
    const target = tgt === "this" ? viewDay : tgt === "next" ? argDate(dayOff + 1) : pk || viewDay;
    const td = getDayData(target);
    const newT = (td.tasks || []).concat([{ id: Date.now() + "", text: nt.trim(), done: false, tag }]);
    setDay(target, Object.assign({}, td, { tasks: newT }));
    setNt("");
    setSpk(false);
  }
  function copyOverdue(t) {
    const td2 = getDayData(today);
    if (td2.tasks.some(x => x.text === t.text)) return;
    setDay(today, Object.assign({}, td2, {
      tasks: td2.tasks.concat([{ id: Date.now() + "", text: t.text, done: false, tag: t.tag || "" }]),
    }));
  }

  const checksDone = habits.filter(h => ch[h.id]).length;
  const filteredTasks = tagFilter ? tasks.filter(t => t.tag === tagFilter) : tasks;
  const tasksDone = tasks.filter(t => t.done).length;
  const total = habits.length + tasks.length;
  const totDone = checksDone + tasksDone;
  const pct = total > 0 ? Math.round(totDone / total * 100) : 0;

  function habitStreak(hid) {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const k = argDate(-i);
      const x = days[k];
      if (x && x.checks && x.checks[hid]) s++;
      else break;
    }
    return s;
  }

  // Overdue
  const yest = argDate(-1);
  const yd = getDayData(yest);
  const overdue = (yd.tasks || []).filter(t => !t.done);

  const weekDays = getWeekDays(viewDay);
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  return (
    <div>
      {/* Day nav */}
      <div className="day-nav">
        <div className="day-nav-arrow" onClick={() => setDayOff(dayOff - 1)}>‹</div>
        <div style={{ textAlign: "center" }}>
          <div className={`day-nav-label ${isToday ? "day-nav-today" : ""}`}>
            {isToday ? "TODAY" : niceDate(viewDay).toUpperCase()}
          </div>
          {!isToday && (
            <div className="day-nav-back" onClick={() => setDayOff(0)}>
              ▸ BACK TO TODAY
            </div>
          )}
        </div>
        <div className="day-nav-arrow" onClick={() => setDayOff(dayOff + 1)}>›</div>
      </div>

      {/* Stats 2×2 */}
      <div className="stats-grid">
        <BigStat label="Streak" value={streak} unit="d" />
        <BigStat label="Done" value={totDone} unit={"/" + total} accent={totDone === total && total > 0 ? "done-all" : "plain"} />
      </div>
      <div className="stats-row">
        <BestStat best={bestStreak} />
        <WeekStat weekDays={weekDays} today={today} habits={habits} days={days} />
      </div>

      {/* Overall progress */}
      <div className="progress">
        <div className="progress-fill" style={{ "--pct": pct / 100 }} />
      </div>

      {/* Overdue */}
      {isToday && overdue.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <SectionHeader label="OVERDUE" variant="overdue" />
          {overdue.map(t => (
            <div key={t.id} className="overdue-row" onClick={() => copyOverdue(t)}>
              <span className="overdue-text">{t.text}</span>
              <span className="overdue-add">+ADD</span>
            </div>
          ))}
        </div>
      )}

      {/* Daily checklist */}
      {!isFuture && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader label="DAILY CHECKLIST" count={checksDone} total={habits.length} />
          <div className="panel">
            {habits.map((h, i) => {
              const on = !!ch[h.id];
              const hs = habitStreak(h.id);
              return (
                <div
                  key={h.id}
                  className={`task-row ${on ? "done" : ""}`}
                  style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: i === 0 ? "none" : undefined, marginBottom: 0 }}
                >
                  <DiamondCheck done={on} onClick={() => toggleCheck(h.id)} />
                  <div className="task-body" onClick={() => toggleCheck(h.id)} style={{ cursor: "pointer" }}>
                    <div className="task-text">{h.text}</div>
                    {h.sub && <div className="task-sub">{h.sub}</div>}
                  </div>
                  {hs > 1 && <div className="task-streak">{hs}d</div>}
                  <div className="task-stat-btn" onClick={(e) => { e.stopPropagation(); openHabitModal(h); }}>
                    📊
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tasks */}
      <SectionHeader label="TASKS" count={tasksDone} total={tasks.length} />

      {/* Tag filter */}
      {tasks.length > 0 && (
        <div className="chip-row" style={{ marginBottom: 10 }}>
          <div
            className={`chip ${!tagFilter ? "active" : ""}`}
            onClick={() => setTagFilter("")}
          >
            All
          </div>
          {TAGS.map(tg => (
            <div
              key={tg}
              className={`chip ${tagClass(tg)} ${tagFilter === tg ? "active" : ""}`}
              onClick={() => setTagFilter(tagFilter === tg ? "" : tg)}
            >
              {tg}
            </div>
          ))}
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="empty-state">
          {isFuture ? "No tasks scheduled" : "No tasks yet"}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filteredTasks.map(t => (
          <div key={t.id} className={`task-row ${t.done ? "done" : ""}`}>
            <RadialCheck done={t.done} onClick={(e) => { if (e) e.stopPropagation(); toggleTask(t.id); }} />
            <div className="task-body">
              {eid === t.id ? (
                <input
                  className="task-edit-input"
                  value={ev}
                  onChange={e => setEv(e.target.value)}
                  onBlur={() => saveEdit(t.id)}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(t.id); if (e.key === "Escape") setEid(null); }}
                  autoFocus
                />
              ) : (
                <div className="task-text" onClick={() => { setEid(t.id); setEv(t.text); }}>
                  {t.text}
                </div>
              )}
            </div>
            {t.tag && <div className={`task-tag ${tagClass(t.tag)}`}>{t.tag}</div>}
            <div className="task-delete" onClick={(e) => { e.stopPropagation(); delTask(t.id); }}>×</div>
          </div>
        ))}
      </div>

      {/* Add task form */}
      <div className="add-form">
        <div className="add-row">
          <input
            className="add-input"
            value={nt}
            onChange={e => setNt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addTask(); }}
            placeholder="+ Add task..."
          />
          <div className="add-btn" onClick={addTask}>ADD</div>
        </div>
        <div className="chip-row">
          {TAGS.map(tg => (
            <div
              key={tg}
              className={`chip ${tagClass(tg)} ${tag === tg ? "active" : ""}`}
              onClick={() => setTag(tag === tg ? "" : tg)}
            >
              {tg}
            </div>
          ))}
          <div style={{ flex: 1 }} />
          {[["this", "This day"], ["next", "Next day"], ["pick", "Date"]].map(p => (
            <div
              key={p[0]}
              className={`chip ${tgt === p[0] ? "active" : ""}`}
              onClick={() => { setTgt(p[0]); setSpk(p[0] === "pick"); }}
            >
              {p[1]}
            </div>
          ))}
        </div>
        {spk && (
          <input
            type="date"
            className="add-date-input"
            value={pk}
            onChange={e => setPk(e.target.value)}
          />
        )}
      </div>

      {/* Quote */}
      {isToday && (
        <div className="quote">
          <div className="quote-text">"{quote}"</div>
        </div>
      )}

      {/* Clean day celebration */}
      {totDone === total && total > 0 && !isFuture && (
        <div className="clean-day">
          <div className="clean-day-text">◆ CLEAN DAY ◆</div>
        </div>
      )}
    </div>
  );
}
