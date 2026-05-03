import { useState, useEffect, useRef } from "react";
import { argDate, niceDate, getWeekDays, dayOfYear, findTag, tagPillStyle, tagChipActiveStyle } from "../config";
import { QUOTES_365 } from "../quotes";
import { DiamondCheck } from "../components/Checks";
import SectionHeader from "../components/SectionHeader";
import { BigStat, BestStat, WeekStat } from "../components/StatCards";
import Monad from "../components/Monad";
import ProgressTicks from "../components/ProgressTicks";
import Celebration from "../components/Celebration";
import TierUp, { TIER_UP_THRESHOLDS } from "../components/TierUp";
import LevelBar from "../components/LevelBar";
import { celebrationTier, canToggleHardDay, hardDaysThisMonth, HARD_DAYS_PER_MONTH, activeHabitsOn } from "../gamification";

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
  setDay, getDayData, streak, bestStreak, hardInStreak, recurring, openHabitModal,
  monadImage,
  levelInfo, badgeInfo, claimNextLevel,
  celebratedThresholds, markThresholdCelebrated,
  bannerPhrases, tags,
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
    setDay(viewDay, current => {
      const currentTasks = current.tasks || [];
      const missing = recToday.filter(r => !currentTasks.some(t => t.recId === r.id));
      if (missing.length === 0) return current;
      return Object.assign({}, current, {
        checks: current.checks || {},
        tasks: currentTasks.concat(missing.map(r => ({
          id: Date.now() + "-" + r.id,
          text: r.text,
          done: false,
          tag: r.tag || "",
          recId: r.id,
        }))),
      });
    });
  }
  useEffect(() => {
    if (isToday && recNotAdded.length > 0) applyRecurring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDay]);

  function toggleCheck(id) {
    setDay(viewDay, current => {
      const nc = Object.assign({}, current.checks || {});
      nc[id] = !nc[id];
      return Object.assign({}, current, { checks: nc, tasks: current.tasks || [] });
    });
  }
  function toggleTask(id) {
    setDay(viewDay, current => Object.assign({}, current, {
      checks: current.checks || {},
      tasks: (current.tasks || []).map(t => t.id === id ? Object.assign({}, t, { done: !t.done }) : t),
    }));
  }
  function delTask(id) {
    setDay(viewDay, current => Object.assign({}, current, {
      checks: current.checks || {},
      tasks: (current.tasks || []).filter(t => t.id !== id),
    }));
  }
  function saveEdit(id) {
    if (!ev.trim()) return;
    setDay(viewDay, current => Object.assign({}, current, {
      checks: current.checks || {},
      tasks: (current.tasks || []).map(t => t.id === id ? Object.assign({}, t, { text: ev.trim() }) : t),
    }));
    setEid(null);
  }
  function addTask() {
    if (!nt.trim()) return;
    const target = tgt === "this" ? viewDay : tgt === "next" ? argDate(dayOff + 1) : pk || viewDay;
    const text = nt.trim();
    setDay(target, current => Object.assign({}, current, {
      checks: current.checks || {},
      tasks: (current.tasks || []).concat([{ id: Date.now() + "", text, done: false, tag }]),
    }));
    setNt("");
    setSpk(false);
  }
  // copyOverdue removed — auto-rollover handles unfinished tasks now.

  // Only the habits that were active on this specific date count toward
  // completion. Adding/archiving a habit today never reshapes past days.
  const dayHabits = activeHabitsOn(habits, viewDay);
  const checksDone = dayHabits.filter(h => ch[h.id]).length;
  // Smart sort: undone tasks float to top (with the heaviest procrastinators
  // ranked first), done tasks sink to the bottom.
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    if (!a.done) return (b.rollCount || 0) - (a.rollCount || 0);
    return 0;
  });
  const filteredTasks = tagFilter ? sortedTasks.filter(t => t.tag === tagFilter) : sortedTasks;
  const tasksDone = tasks.filter(t => t.done).length;
  const total = dayHabits.length + tasks.length;
  const totDone = checksDone + tasksDone;
  const pct = total > 0 ? Math.round(totDone / total * 100) : 0;

  // ════════ CELEBRATION TRIGGER ════════
  // Fires every time the day transitions <100% → 100%. Re-fires if
  // user unchecks then re-completes, or if a new task is added after
  // a clean day and then finished. Tier scales with current streak.
  // If this close crosses a TIER_UP_THRESHOLDS for the FIRST time
  // (per data.celebratedThresholds), fire the cinematic instead of
  // the regular celebration.
  const [celebState, setCelebState] = useState({ id: 0, streak: 0 });
  const [tierUpState, setTierUpState] = useState({ id: 0, threshold: null });
  const wasCompleteRef = useRef(false);
  const prevViewDayRef = useRef(viewDay);
  useEffect(() => {
    if (isFuture || total === 0) {
      wasCompleteRef.current = false;
      prevViewDayRef.current = viewDay;
      return;
    }
    const isComplete = totDone === total;
    if (prevViewDayRef.current !== viewDay) {
      wasCompleteRef.current = isComplete;
      prevViewDayRef.current = viewDay;
      return;
    }
    if (isComplete && !wasCompleteRef.current) {
      const effectiveStreak = isToday ? streak + 1 : streak;
      // Threshold crossing? Pick the highest unseen threshold <= effectiveStreak.
      const seen = new Set((celebratedThresholds || []).map(Number));
      const unseen = TIER_UP_THRESHOLDS.filter(t => effectiveStreak >= t && !seen.has(t));
      if (unseen.length > 0) {
        const threshold = unseen[unseen.length - 1]; // highest unseen
        setTierUpState(s => ({ id: s.id + 1, threshold }));
        if (markThresholdCelebrated) markThresholdCelebrated(threshold);
      } else {
        setCelebState(s => ({ id: s.id + 1, streak: effectiveStreak }));
      }
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

  const weekDays = getWeekDays(viewDay);
  // New quote per day of year — wraps automatically across leap years.
  const quote = QUOTES_365[dayOfYear(today) % QUOTES_365.length];

  return (
    <div>
      <Celebration fireId={celebState.id} streak={celebState.streak} bannerPhrases={bannerPhrases} />
      <TierUp fireId={tierUpState.id} threshold={tierUpState.threshold} />
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
        <Monad size={150} config={monadImage} />
        <div className="day-hero-stats">
          <div className="stats-grid">
            <BigStat
              label="Streak"
              value={streak}
              unit="d"
              odometer
              subText={hardInStreak > 0 ? `incl ${hardInStreak} hard day${hardInStreak > 1 ? "s" : ""}` : null}
            />
            <BigStat label="Done" value={totDone} unit={"/" + total}
              accent={totDone === total && total > 0 ? "done-all" : "plain"} />
          </div>
          <div className="stats-row">
            <BestStat best={bestStreak} />
            <WeekStat weekDays={weekDays} today={today} habits={habits} days={days} />
          </div>
          <ProgressTicks done={totDone} total={total} />
          <LevelBar levelInfo={levelInfo} onClaim={claimNextLevel} />
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

      {/* OVERDUE panel removed — auto-rollover already brings yesterday's
          undone tasks onto today with the procrastination badge. */}

      {/* Daily checklist — using .row style (same as tasks) */}
      {!isFuture && (
        <div style={{ marginBottom: 20 }}>
          <SectionHeader label="DAILY CHECKLIST" count={checksDone} total={dayHabits.length} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {dayHabits.map(h => {
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
          {tags.map(t => {
            const active = tagFilter === t.name;
            return (
              <div
                key={t.id}
                className={`chip ${active ? "active" : ""}`}
                style={tagChipActiveStyle(t.color, active)}
                onClick={() => setTagFilter(active ? "" : t.name)}
              >
                {t.name}
              </div>
            );
          })}
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="empty-state">
          {isFuture ? "No tasks scheduled" : "No tasks yet"}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {filteredTasks.map(t => {
          const rc = t.rollCount || 0;
          const rcTier = rc === 0 ? 0 : Math.min(rc, 5);
          const rollLabel = rc === 1
            ? (t.rolledFromYesterday || !t.rolledFromDate ? "rolled from yesterday" : `rolled from ${niceDate(t.rolledFromDate)}`)
            : rc < 5 ? `procrastinating · ${rc} rolls` : `PROCRASTINATING · ${rc} rolls`;
          return (
            <div key={t.id} className={`row ${t.done ? "done" : ""} ${rcTier > 0 ? `row-roll-${rcTier}` : ""}`}
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
                {rc > 0 && !t.done && (
                  <div className="row-sub row-roll-sub">
                    {rollLabel}
                  </div>
                )}
              </div>
              {rcTier > 0 && !t.done && (
                <div className={`task-roll-badge tier-${rcTier}`} title={`Rolled over ${rc} time${rc > 1 ? "s" : ""}`}>
                  ↻{rc}
                </div>
              )}
              {t.tag && (() => {
                const tagObj = findTag(t.tag, tags);
                const c = tagObj ? tagObj.color : null;
                return <div className={`row-tag ${c ? "" : "orphan"}`} style={tagPillStyle(c)}>{t.tag}</div>;
              })()}
              <div className="row-delete" onClick={(e) => { e.stopPropagation(); delTask(t.id); }}>×</div>
            </div>
          );
        })}
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
          {tags.map(t => {
            const active = tag === t.name;
            return (
              <div
                key={t.id}
                className={`chip ${active ? "active" : ""}`}
                style={tagChipActiveStyle(t.color, active)}
                onClick={() => setTag(active ? "" : t.name)}
              >
                {t.name}
              </div>
            );
          })}
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
