function stepSlug(text) {
  const raw = String(text || "").toLowerCase().trim();
  const slug = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 18);
  return slug || "step";
}

function fallbackStepId(text, index) {
  return `s-${index}-${stepSlug(text)}`;
}

function newStepId(text, index) {
  return `s-${Date.now().toString(36)}-${index}-${stepSlug(text)}`;
}

function linesFromText(text) {
  return String(text || "")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

export function normalizeSteps(steps) {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((raw, index) => {
      const source = typeof raw === "string" ? { text: raw } : (raw || {});
      const text = String(source.text || "").trim();
      if (!text) return null;
      const out = {
        id: String(source.id || fallbackStepId(text, index)),
        text,
      };
      if ("done" in source) out.done = !!source.done;
      if (source.createdAt) out.createdAt = String(source.createdAt);
      if (source.archivedAt) out.archivedAt = String(source.archivedAt);
      return out;
    })
    .filter(Boolean);
}

export function visibleSteps(steps) {
  return normalizeSteps(steps).filter(step => !step.archivedAt);
}

export function activeStepsOn(steps, dateStr) {
  return normalizeSteps(steps).filter(step => {
    if (!dateStr) return !step.archivedAt;
    if (step.createdAt && step.createdAt > dateStr) return false;
    if (step.archivedAt && step.archivedAt <= dateStr) return false;
    return true;
  });
}

export function activeHabitSteps(habit, dateStr) {
  return activeStepsOn((habit && (habit.steps || habit.subtasks)) || [], dateStr);
}

export function taskSteps(task) {
  return visibleSteps((task && (task.steps || task.subtasks)) || []);
}

export function recurringSteps(item) {
  return visibleSteps((item && (item.steps || item.subtasks)) || []);
}

export function stepsToText(steps) {
  return visibleSteps(steps).map(step => step.text).join("\n");
}

function findReusableStep(existing, line, index, used) {
  const key = line.toLowerCase();
  const byText = existing.find(step => !used.has(step.id) && step.text.toLowerCase() === key);
  if (byText) return byText;
  const byIndex = existing[index];
  if (byIndex && !used.has(byIndex.id)) return byIndex;
  return null;
}

export function mergeStepsFromText(text, existingSteps, options = {}) {
  const lines = linesFromText(text);
  const existing = visibleSteps(existingSteps);
  const used = new Set();
  const includeDone = !!options.includeDone;
  const doneDefault = !!options.doneDefault;

  return lines.map((line, index) => {
    const old = findReusableStep(existing, line, index, used);
    if (old) used.add(old.id);
    const step = {
      id: old ? old.id : newStepId(line, index),
      text: line,
    };
    if (includeDone) step.done = old && "done" in old ? !!old.done : doneDefault;
    return step;
  });
}

export function mergeHabitStepsFromText(text, existingSteps, todayStr) {
  const lines = linesFromText(text);
  const existing = normalizeSteps(existingSteps);
  const visible = existing.filter(step => !step.archivedAt);
  const archived = existing.filter(step => step.archivedAt);
  const used = new Set();
  const nextVisible = lines.map((line, index) => {
    const old = findReusableStep(visible, line, index, used);
    if (old) used.add(old.id);
    const step = {
      id: old ? old.id : newStepId(line, index),
      text: line,
    };
    if (old && old.createdAt) step.createdAt = old.createdAt;
    else if (todayStr) step.createdAt = todayStr;
    return step;
  });
  const removed = visible
    .filter(step => !used.has(step.id))
    .map(step => Object.assign({}, step, { archivedAt: todayStr || step.archivedAt || "" }));
  return nextVisible.concat(removed, archived);
}

export function isTaskDone(task) {
  const steps = taskSteps(task);
  if (steps.length > 0) return steps.every(step => !!step.done);
  return !!(task && task.done);
}

export function taskProgress(task) {
  const steps = taskSteps(task);
  if (steps.length === 0) return null;
  return {
    done: steps.filter(step => !!step.done).length,
    total: steps.length,
  };
}

export function syncTaskDone(task) {
  if (!task) return task;
  const steps = taskSteps(task);
  if (steps.length === 0) return task;
  return Object.assign({}, task, { steps, done: steps.every(step => !!step.done) });
}

export function isHabitDone(dayData, habit, dateStr) {
  if (!habit) return false;
  const steps = activeHabitSteps(habit, dateStr);
  if (steps.length > 0) {
    const stepChecks = (((dayData || {}).habitSteps || {})[habit.id]) || {};
    return steps.every(step => !!stepChecks[step.id]);
  }
  return !!(((dayData || {}).checks || {})[habit.id]);
}

export function habitProgress(dayData, habit, dateStr) {
  const steps = activeHabitSteps(habit, dateStr);
  if (steps.length === 0) return null;
  const stepChecks = (((dayData || {}).habitSteps || {})[habit.id]) || {};
  return {
    done: steps.filter(step => !!stepChecks[step.id]).length,
    total: steps.length,
  };
}
