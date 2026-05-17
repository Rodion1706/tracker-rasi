// Auto-rollover unchecked tasks from previous unprocessed days onto today.
// Each rollover bumps task.rollCount and tags task.originalDate so the
// procrastination escalation UI can shame the task into action.
//
// Hard Mode used to drop tasks after too many rolls. It now does the
// opposite: tasks never get auto-deleted; the UI locks deletion and
// escalates pressure until the task is actually closed.
//
// We mark source tasks rolledOver: true after rolling so we never
// roll the same task twice. The past day's record stays intact otherwise
// (no flipping done state) so the past day's % stays accurate.

import { argDate, dayDiff } from "./config";
import { isTaskDone, taskSteps } from "./checklists";

export function applyRollover(data) {
  const days = data.days || {};
  const today = argDate(0);
  const yest = argDate(-1);

  const td = days[today] || { checks: {}, tasks: [] };
  const newTodayTasks = (td.tasks || []).slice();
  let rolled = 0;
  let touched = false;

  const startDay = data._lastRolloverDay && data._lastRolloverDay < today
    ? data._lastRolloverDay
    : yest;
  const sourceDays = Object.keys(days)
    .filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k) && k >= startDay && k < today)
    .sort();

  if (sourceDays.length === 0) return null;

  const nextDays = Object.assign({}, days);

  for (const sourceDay of sourceDays) {
    const yd = days[sourceDay];
    if (!yd || !Array.isArray(yd.tasks)) continue;

    const undoneUnrolled = yd.tasks.filter(t => t && !isTaskDone(t) && !t.rolledOver);
    if (undoneUnrolled.length === 0) continue;

    for (const t of undoneUnrolled) {
      const originalDate = t.originalDate || sourceDay;
      const procrastinatedDays = Math.max(1, dayDiff(today, originalDate));
      const newCount = Math.max((t.rollCount || 0) + 1, procrastinatedDays);

      // Skip if today already has a task with same text + tag (manual dup).
      const dup = newTodayTasks.some(tt => tt.text === t.text && (tt.tag || "") === (t.tag || ""));
      if (dup) continue;

      newTodayTasks.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-roll`,
        text: t.text,
        tag: t.tag || "",
        done: false,
        steps: taskSteps(t),
        rollCount: newCount,
        originalDate,
        rolledFromYesterday: dayDiff(today, sourceDay) === 1,
        rolledFromDate: sourceDay,
      });
      rolled++;
    }

    // Mark old undone tasks as rolledOver so a re-render doesn't roll them again.
    nextDays[sourceDay] = Object.assign({}, yd, {
      tasks: yd.tasks.map(t =>
        t && !isTaskDone(t) && !t.rolledOver ? Object.assign({}, t, { rolledOver: true }) : t
      ),
    });
    touched = true;
  }

  if (!touched) return null;

  // Nothing rolled in (all dups) — still mark yesterday as processed.
  if (newTodayTasks.length !== (td.tasks || []).length) {
    nextDays[today] = Object.assign({}, td, { tasks: newTodayTasks });
  }

  return {
    nextData: Object.assign({}, data, { days: nextDays }),
    rolled,
    dropped: [],
  };
}
