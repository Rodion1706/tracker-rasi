// Auto-rollover unchecked tasks from yesterday onto today.
// Each rollover bumps task.rollCount and tags task.originalDate so the
// procrastination escalation UI can shame the task into action.
//
// Hard Mode: when data.hardModeOn is true, a task that would land at
// rollCount > HARD_MODE_LIMIT is dropped instead of rolled. Without
// hard mode, tasks roll forever (just look more alarming each time).
//
// We mark yesterday's tasks rolledOver: true after rolling so we never
// roll the same task twice. Yesterday's record stays intact otherwise
// (no flipping done state) so the past day's % stays accurate.

import { argDate } from "./config";

export const HARD_MODE_LIMIT = 5;

export function applyRollover(data) {
  const days = data.days || {};
  const today = argDate(0);
  const yest = argDate(-1);

  const yd = days[yest];
  if (!yd || !Array.isArray(yd.tasks)) return null;

  const undoneUnrolled = yd.tasks.filter(t => !t.done && !t.rolledOver);
  if (undoneUnrolled.length === 0) return null;

  const td = days[today] || { checks: {}, tasks: [] };
  const newTodayTasks = (td.tasks || []).slice();
  const dropped = [];

  const hardModeOn = !!data.hardModeOn;

  for (const t of undoneUnrolled) {
    const newCount = (t.rollCount || 0) + 1;
    const originalDate = t.originalDate || yest;

    // Hard Mode: drop instead of rolling once threshold crossed.
    if (hardModeOn && newCount > HARD_MODE_LIMIT) {
      dropped.push({ text: t.text, count: t.rollCount || 0 });
      continue;
    }

    // Skip if today already has a task with same text + tag (manual dup).
    const dup = newTodayTasks.some(tt => tt.text === t.text && (tt.tag || "") === (t.tag || ""));
    if (dup) continue;

    newTodayTasks.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-roll`,
      text: t.text,
      tag: t.tag || "",
      done: false,
      rollCount: newCount,
      originalDate,
      rolledFromYesterday: true,
    });
  }

  // Mark yesterday's undone tasks as rolledOver so a re-render doesn't roll them again.
  const newYTasks = yd.tasks.map(t =>
    !t.done && !t.rolledOver ? Object.assign({}, t, { rolledOver: true }) : t
  );

  // Nothing rolled in (all dups / all dropped) — still mark yesterday as processed.
  const nextDays = Object.assign({}, days);
  nextDays[yest] = Object.assign({}, yd, { tasks: newYTasks });
  if (newTodayTasks.length !== (td.tasks || []).length) {
    nextDays[today] = Object.assign({}, td, { tasks: newTodayTasks });
  }

  return {
    nextData: Object.assign({}, data, { days: nextDays }),
    rolled: undoneUnrolled.length - dropped.length,
    dropped,
  };
}
