import { useState, useEffect, useRef } from "react";
import { TAGS, argDate, niceDate, getWeekDays, dayOfYear } from "../config";
import { QUOTES_365 } from "../quotes";
import { DiamondCheck } from "../components/Checks";
import SectionHeader from "../components/SectionHeader";
import { BigStat, BestStat, WeekStat } from "../components/StatCards";
import Monad from "../components/Monad";
import ProgressTicks from "../components/ProgressTicks";
import Celebration from "../components/Celebration";
import LevelBar from "../components/LevelBar";
import { celebrationTier, canToggleHardDay, hardDaysThisMonth, HARD_DAYS_PER_MONTH } from "../gamification";

function tagClass(tag) {
  if (tag === "Work 1") return "work1";
  if (tag === "Work 2") return "work2";
  if (tag === "Channel") return "channel";
  if (tag === "Personal") return "personal";
  return "";
}

// Chart/graph SVG icon (replaces 📊 emoji)
function ChartIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 14 L2 2" />
      <path d="M2 14 L14 14" />
      <rect x="4" y="9" width="2" height="4" fill="currentColor" stroke="none" rx="0.3" />
      <rect x="7.5" y="5" width="2" height="8" fill="currentColor" stroke="none" rx="0.3" />
      <rect x="11" y="7" width="2" height="6" fill="currentColor" stroke="none" rx="0.3" />
    </svg>
  );
}

export default function DayTab({
  days, habits, today, dayOff, setDayOff,
  setDay, getDayData, streak, bestStreak, recurring, openHabitModal,
  levelInfo, badgeInfo,
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

  // ════════ CELEBRATION TRIGGER ════════
  // Fires every time the day transitions <100% → 100%. Re-fires if
  // user unchecks then re-completes, or if a new task is added after
  // a clean day and then finished. Tier scales with current streak:
  // 7+ = WEEK CLEAN, 14+ = FORTNIGHT, 30+ = MONTH, 100+ = CENTURY.
  const [celebState, setCelebState] = useState({ id: 0, streak: 0 });
  const wasCompleteRef = useRef(false);
  const prevViewDayRef = useRef(viewDay);
  useEffect(() => {
    if (isFuture || total === 0) {
      wasCompleteRef.current = false;
      prevViewDayRef.current = viewDay;
      return;
    }
    const isComplete = totDone === total;
    // Day switch: resync silently, no celebration fires for navigation.
    if (prevViewDayRef.current !== viewDay) {
      wasCompleteRef.current = isComplete;
      prevViewDayRef.current = viewDay;
      return;
    }
    if (isComplete && !wasCompleteRef.current) {
      // On close: if today wasn't counted in streak yet, add 1 for the tier calc
      const effectiveStreak = isToday ? streak + 1 : streak;
      setCelebState(s => ({ id: s.id + 1, streak: effectiveStreak }));
    }
    wasCompleteRef.current = isComplete;
  }, [totDone, total, isFuture, viewDay, streak, isToday]);

  // ════════ HARD DAY TOGGLE ════════
  function toggleHardDay() {
    const isOn = !!dd.hardDay;
    if (!isOn && !canToggleHardDay(days, viewDay, false)) return; // budget exhausted
    setDay(viewDay, Object.assign({}, dd, { hardDay: !isOn }));
  }
  const hardDayUsedThisMonth = hardDaysThisMonth(days, viewDay);
  const hardDayBudgetLeft = HARD_DAYS_PER_MONTH - hardDayUsedThisMonth;

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

  const yest = argDate(-1);
  const yd = getDayData(yest);
  const overdue = (yd.tasks || []).filter(t => !t.done);

  const weekDays = getWeekDays(viewDay);
  // New quote per day of year — wraps automatically across leap years.
  const quote = QUOTES_365[dayOfYear(today) % QUOTES_365.length];

  return (
    <div>
      <Celebration fireId={celebState.id} streak={celebState.streak} />
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

      {/* Hero: Monad + stats */}
      <div className="day-hero">
        <Monad size={150} />
        <div className="day-hero-stats">
          <div className="stats-grid">
            <BigStat label="Streak" value={streak} unit="d" />
            <BigStat label="Done" value={totDone} unit={"/" + total}
              accent={totDone === total && total > 0 ? "done-all" : "plain"} />
          </div>
          <div className="stats-row">
            <BestStat best={bestStreak} />
            <WeekStat weekDays={weekDays} today={today} habits={habits} days={days} />
          </div>
          <ProgressTicks done={totDone} total={total} />
          <LevelBar levelInfo={levelInfo} />
        </div>
      </div>

      {/* Hard Day toggle — 2/month budget, counts day as clean for streak */}
      {!isFuture && (
        <div className={`hard-day ${dd.hardDay ? "on" : ""}`}>
          <div
            className="hard-day-toggle"
            onClick={toggleHardDay}
            title={
              dd.hardDay
                ? "Hard Day active — streak protected"
                : hardDayBudgetLeft > 0
                  ? "Mark this as a Hard Day (free streak pass, " + hardDayBudgetLeft + " left this month)"
                  : "No Hard Day passes left this month"
            }
            style={{ cursor: dd.hardDay || hardDayBudgetLeft > 0 ? "pointer" : "not-allowed" }}
          >
            <span className="hard-day-icon">{dd.hardDay ? "◆" : "◇"}</span>
            <span className="hard-day-label">
              {dd.hardDay ? "HARD DAY" : "MARK HARD DAY"}
            </span>
            <span className="hard-day-budget">{hardDayUsedThisMonth}/{HARD_DAYS_PER_MONTH}</span>
          </div>
        </div>
      )}

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

      {/* Daily checklist — using .row style (same as tasks) */}
      {!isFuture && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader label="DAILY CHECKLIST" count={checksDone} total={habits.length} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {habits.map(h => {
              const on = !!ch[h.id];
              const hs = habitStreak(h.id);
              return (
                <div key={h.id} className={`row ${on ? "done" : ""}`}
                  onClick={() => toggleCheck(h.id)}>
                  <DiamondCheck done={on} onClick={(e) => { if (e) e.stopPropagation(); toggleCheck(h.id); }} />
                  <div className="row-body">
                    <div className="row-text">{h.text}</div>
                    {h.sub && <div className="row-sub">{h.sub}</div>}
                  </div>
                  {hs > 1 && <div className="row-streak">{hs}d</div>}
                  <div className="chart-btn" onClick={(e) => { e.stopPropagation(); openHabitModal(h); }} title="Calendar">
                    <ChartIcon />
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

      <div style={{ display: "flex", flexDirection: "column" }}>
        {filteredTasks.map(t => (
          <div key={t.id} className={`row ${t.done ? "done" : ""}`}
            onClick={() => toggleTask(t.id)}>
            <DiamondCheck done={t.done} onClick={(e) => { if (e) e.stopPropagation(); toggleTask(t.id); }} />
            <div className="row-body">
              {eid === t.id ? (
                <input
                  className="task-edit-input"
                  value={ev}
                  onChange={e => setEv(e.target.value)}
                  onBlur={() => saveEdit(t.id)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(t.id); if (e.key === "Escape") setEid(null); }}
                  autoFocus
                />
              ) : (
                <div className="row-text" onClick={(e) => { e.stopPropagation(); setEid(t.id); setEv(t.text); }}>
                  {t.text}
                </div>
              )}
            </div>
            {t.tag && <div className={`row-tag ${tagClass(t.tag)}`}>{t.tag}</div>}
            <div className="row-delete" onClick={(e) => { e.stopPropagation(); delTask(t.id); }}>×</div>
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
          <div className="quote-text">{quote}</div>
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
