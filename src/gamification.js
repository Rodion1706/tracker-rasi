// Gamification layer — XP, Levels, Badges, Combo tiers.
// PERSISTENCE MODEL: once earned, stays. lifetimeXP and unlockedBadges
// live on user data and only ever grow. A separate creditedDays list
// guarantees each clean day is counted once even if Boss rechecks days.

import { argDate } from "./config";

// ══════ CORE: which habits were active on a given date ══════
// Habits carry createdAt (date string YYYY-MM-DD) when added, and
// archivedAt when "deleted". A habit is active on day K iff
// createdAt <= K AND (archivedAt is undefined OR archivedAt > K).
// Habits without createdAt are treated as having always existed
// (back-compat for the pre-migration state).
export function activeHabitsOn(habits, dateStr) {
  if (!habits || !dateStr) return habits || [];
  return habits.filter(h => {
    const c = h.createdAt;
    const a = h.archivedAt;
    if (c && c > dateStr) return false;       // not yet created
    if (a && a <= dateStr) return false;      // already archived
    return true;
  });
}

// ══════ CORE: day cleanness ══════
// A day counts as "clean" when every habit ACTIVE ON THAT DAY is
// checked, OR the user explicitly marked it a Hard Day.
// In STRICT mode, also requires every task on that day to be done.
// Adding/removing habits today never changes past-day cleanness.
export function isDayClean(dayData, habits, dateStr, strict = false) {
  if (!dayData) return false;
  if (dayData.hardDay) return true;
  const active = dateStr ? activeHabitsOn(habits, dateStr) : (habits || []);
  if (!active || active.length === 0) return false;
  if (!dayData.checks) return false;
  if (!active.every(h => dayData.checks[h.id])) return false;
  if (strict) {
    const tasks = dayData.tasks || [];
    if (tasks.length > 0 && !tasks.every(t => t.done)) return false;
  }
  return true;
}

// ══════ XP CONSTANTS ══════
// Each clean day banks 100 XP. The level ladder is built so that the
// number of clean days needed for the NEXT level always doubles the
// number needed for the CURRENT level. Starts at 7 (one week) so the
// first level-up arrives reliably for someone keeping a routine.
//
// Days to next level by level:
//   L1→L2:  7  (1 week)
//   L2→L3:  14 (2 weeks)
//   L3→L4:  28 (1 month)
//   L4→L5:  56 (~8 weeks)
//   L5→L6:  112 (~16 weeks)
//   L6→L7:  224 (~7 months)
//   L7→L8:  448 (~14 months)
//   L8→L9:  896 (~2.5 years)
//   L9→L10: 1792 (~5 years, the unreachable goalpost)
//
// Cumulative days = 0, 7, 21, 49, 105, 217, 441, 889, 1785, 3577.
// Multiplied by XP_PER_CLEAN_DAY for thresholds.
export const XP_PER_CLEAN_DAY = 100;

export const LEVELS = [
  { id: 1,  name: "INITIATE",    threshold:      0 }, //  0 clean days
  { id: 2,  name: "DISCIPLINED", threshold:    700 }, //  7 days  (1 week)
  { id: 3,  name: "SHARPENED",   threshold:   2100 }, // 21 days  (3 weeks)
  { id: 4,  name: "FORGED",      threshold:   4900 }, // 49 days  (~7 weeks)
  { id: 5,  name: "OBSESSED",    threshold:  10500 }, // 105 days (~3.5 months)
  { id: 6,  name: "MONK",        threshold:  21700 }, // 217 days (~7 months)
  { id: 7,  name: "RELENTLESS",  threshold:  44100 }, // 441 days (~14 months)
  { id: 8,  name: "UNTOUCHABLE", threshold:  88900 }, // 889 days (~2.4 years)
  { id: 9,  name: "LEGENDARY",   threshold: 178500 }, // 1785 days (~4.9 years)
  { id: 10, name: "ASCENDED",    threshold: 357700 }, // 3577 days (~9.8 years)
];

// Auto-progression — current level is whatever XP earns. Used internally
// for badge/streak math but NOT for the visible LevelBar (that one
// honors the user's claimedLevel so they tap to advance).
export function getLevel(xp) {
  let current = LEVELS[0];
  for (const lv of LEVELS) {
    if (xp >= lv.threshold) current = lv;
    else break;
  }
  const nextIdx = LEVELS.findIndex(l => l.id === current.id) + 1;
  const next = LEVELS[nextIdx] || null;
  const progress = next
    ? (xp - current.threshold) / (next.threshold - current.threshold)
    : 1;
  return { level: current, next, progress: Math.max(0, Math.min(1, progress)), xp };
}

// Display-level — pinned to the user's claimedLevel. The bar progresses
// toward the NEXT level after claimed. When XP crosses next.threshold
// the bar parks at 100% and `available` becomes true → user must tap
// to claim, video-game style. Returns same shape as getLevel plus
// {available, available_count}.
export function getDisplayLevel(xp, claimedLevel) {
  const cid = claimedLevel || 1;
  const current = LEVELS.find(l => l.id === cid) || LEVELS[0];
  const nextIdx = LEVELS.findIndex(l => l.id === current.id) + 1;
  const next = LEVELS[nextIdx] || null;
  if (!next) {
    return { level: current, next: null, progress: 1, xp, available: false, availableCount: 0 };
  }
  const range = next.threshold - current.threshold;
  const inRange = xp - current.threshold;
  const rawProgress = range > 0 ? inRange / range : 1;
  const available = xp >= next.threshold;
  // How many levels are unclaimed in total (Boss might fall behind by N)
  let availableCount = 0;
  for (let i = nextIdx; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].threshold) availableCount++;
    else break;
  }
  return {
    level: current,
    next,
    progress: available ? 1 : Math.max(0, Math.min(1, rawProgress)),
    xp,
    available,
    availableCount,
  };
}

// ══════ COMBO TIER (celebration escalation) ══════
export function celebrationTier(streakAfterClose) {
  if (streakAfterClose >= 100) return { tier: 5, label: "CENTURY" };
  if (streakAfterClose >= 30)  return { tier: 4, label: "MONTH CLEAN" };
  if (streakAfterClose >= 14)  return { tier: 3, label: "FORTNIGHT" };
  if (streakAfterClose >= 7)   return { tier: 2, label: "WEEK CLEAN" };
  return { tier: 1, label: null };
}

// ══════ BADGES ══════
// Order = display order. Categories grouped naturally.
export const BADGES = [
  // ── First steps ──
  { id: "first-spark",   name: "FIRST SPARK",   desc: "Close your first clean day", category: "intro" },
  // ── Streak runs (best ever) ──
  { id: "chain",         name: "CHAIN",         desc: "3-day streak", category: "streak" },
  { id: "week-clear",    name: "WEEK CLEAR",    desc: "7-day streak", category: "streak" },
  { id: "fortnight",     name: "FORTNIGHT",     desc: "14-day streak", category: "streak" },
  { id: "month-iron",    name: "MONTH IRON",    desc: "30-day streak", category: "streak" },
  { id: "half-hundred",  name: "50 DAYS",       desc: "50-day streak", category: "streak" },
  { id: "relic",         name: "RELIC",         desc: "100-day streak", category: "streak" },
  { id: "two-hundred",   name: "TWO HUNDRED",   desc: "200-day streak", category: "streak" },
  { id: "year-streak",   name: "YEAR STREAK",   desc: "365-day streak", category: "streak" },
  // ── Cumulative clean days ──
  { id: "ten",           name: "10 CLEAN",      desc: "10 clean days total", category: "total" },
  { id: "fifty",         name: "50 CLEAN",      desc: "50 clean days total", category: "total" },
  { id: "quarter",       name: "QUARTER",       desc: "90 clean days total", category: "total" },
  { id: "hundred",       name: "100 CLEAN",     desc: "100 clean days total", category: "total" },
  { id: "half-year",     name: "HALF YEAR",     desc: "180 clean days total", category: "total" },
  { id: "full-year",     name: "FULL YEAR",     desc: "365 clean days total", category: "total" },
  // ── Tasks shipped ──
  { id: "task-100",      name: "100 SHIPPED",   desc: "100 tasks completed", category: "task" },
  { id: "task-500",      name: "500 SHIPPED",   desc: "500 tasks completed", category: "task" },
  { id: "marathon",      name: "MARATHON",      desc: "1000 tasks completed", category: "task" },
  // ── Special ──
  { id: "lone-wolf",     name: "LONE WOLF",     desc: "5-day clean streak with no Hard Day used", category: "special" },
  { id: "perfect-month", name: "PERFECT MONTH", desc: "Full calendar month clean, no Hard Day", category: "special" },
  { id: "comeback",      name: "COMEBACK",      desc: "14-day streak after a previous 7+ streak broke", category: "special" },
];

// ══════ COMPUTE: full state derivation ══════
// Returns the SET of badges currently earnable based on full days history,
// plus useful aggregates. Called on init + every meaningful change.
export function computeBadgesEarnable(days, habits, strict = false) {
  let totalClean = 0, bestStreak = 0, curStreak = 0, totalTasksDone = 0;
  let curStreakUsedHardDay = false;
  let pastStreakBrokeAtSeven = false; // true if there was ever a >=7 streak that ended
  let bestSoloStreak = 0; // best streak with NO hard day in it

  // Walk days chronologically
  const keys = Object.keys(days).sort();
  for (const k of keys) {
    const d = days[k];
    if (isDayClean(d, habits, k, strict)) {
      totalClean++;
      curStreak++;
      if (d && d.hardDay) curStreakUsedHardDay = true;
      if (curStreak > bestStreak) bestStreak = curStreak;
      if (!curStreakUsedHardDay && curStreak > bestSoloStreak) bestSoloStreak = curStreak;
    } else {
      if (curStreak >= 7) pastStreakBrokeAtSeven = true;
      curStreak = 0;
      curStreakUsedHardDay = false;
    }
    if (d && d.tasks) {
      totalTasksDone += d.tasks.filter(t => t.done).length;
    }
  }

  // Perfect month: any calendar month where every day was clean and no hardDay used
  const perfectMonth = checkPerfectMonth(days, habits);

  // Comeback: there was a prior >=7 broken streak, and current best streak after that is >=14
  // We approximate: if pastStreakBrokeAtSeven AND bestStreak >= 14, qualifies
  // (more accurate: check that 14 streak occurred AFTER the break — let's stick with this approximation)
  const comeback = pastStreakBrokeAtSeven && bestStreak >= 14;

  const earnable = new Set();
  if (totalClean >= 1)   earnable.add("first-spark");
  if (bestStreak >= 3)   earnable.add("chain");
  if (bestStreak >= 7)   earnable.add("week-clear");
  if (bestStreak >= 14)  earnable.add("fortnight");
  if (bestStreak >= 30)  earnable.add("month-iron");
  if (bestStreak >= 50)  earnable.add("half-hundred");
  if (bestStreak >= 100) earnable.add("relic");
  if (bestStreak >= 200) earnable.add("two-hundred");
  if (bestStreak >= 365) earnable.add("year-streak");
  if (totalClean >= 10)  earnable.add("ten");
  if (totalClean >= 50)  earnable.add("fifty");
  if (totalClean >= 90)  earnable.add("quarter");
  if (totalClean >= 100) earnable.add("hundred");
  if (totalClean >= 180) earnable.add("half-year");
  if (totalClean >= 365) earnable.add("full-year");
  if (totalTasksDone >= 100)  earnable.add("task-100");
  if (totalTasksDone >= 500)  earnable.add("task-500");
  if (totalTasksDone >= 1000) earnable.add("marathon");
  if (bestSoloStreak >= 5)    earnable.add("lone-wolf");
  if (perfectMonth)           earnable.add("perfect-month");
  if (comeback)               earnable.add("comeback");

  return { earnable, totalClean, bestStreak, totalTasksDone, bestSoloStreak };
}

function checkPerfectMonth(days, habits) {
  // Group keys by yyyy-mm. For each month with >=28 clean days where no
  // hardDay was used and no day in the month is non-clean (in past).
  const today = argDate(0);
  const months = new Map();
  for (const k of Object.keys(days)) {
    const ym = k.slice(0, 7);
    if (!months.has(ym)) months.set(ym, []);
    months.get(ym).push(k);
  }
  for (const [ym, monthKeys] of months) {
    // Skip current month — only fully completed months count
    if (today.startsWith(ym)) continue;
    // Determine days-in-month from yyyy-mm
    const [y, m] = ym.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    let cleanCount = 0, hardUsed = false, allClean = true;
    for (let dd = 1; dd <= daysInMonth; dd++) {
      const k = ym + "-" + String(dd).padStart(2, "0");
      const d = days[k];
      if (!isDayClean(d, habits, k)) { allClean = false; break; }
      cleanCount++;
      if (d && d.hardDay) hardUsed = true;
    }
    if (allClean && !hardUsed && cleanCount === daysInMonth) return true;
  }
  return false;
}

// ══════ HABIT MIGRATION ══════
// One-time per habit: stamp createdAt on any habit that doesn't have it.
// Heuristic: a habit's createdAt is the EARLIEST day where its check key
// appears in the days map. If it never appears, it's brand new — stamp
// today. This means: a habit with weeks of history keeps its history;
// a habit Boss just added before this code shipped gets locked to today
// and stops appearing on past days.
export function migrateHabitsCreatedAt(habits, days, todayStr) {
  if (!habits || habits.length === 0) return habits;
  let changed = false;
  const keys = Object.keys(days || {}).sort();
  const next = habits.map(h => {
    if (h.createdAt) return h;
    let earliest = null;
    for (const k of keys) {
      const d = days[k];
      if (d && d.checks && (h.id in d.checks)) { earliest = k; break; }
    }
    changed = true;
    return Object.assign({}, h, { createdAt: earliest || todayStr });
  });
  return changed ? next : habits;
}

// ══════ PERSISTENCE-AWARE UPDATER ══════
// Given existing data, returns a NEW data object with: habit createdAt
// migration applied, newly-earned badges appended, and new clean days
// credited to lifetimeXP. Returns null when nothing changes.
export function applyGamificationUpdates(data, habits, todayStr) {
  const days = data.days || {};
  const stored = data.unlockedBadges || [];
  const credited = new Set(data.creditedDays || []);
  const lifetimeXP = data.lifetimeXP || 0;
  const strict = !!data.strictStreak;

  // 0. Migrate habits without createdAt — affects subsequent calcs too.
  const migratedHabits = migrateHabitsCreatedAt(habits, days, todayStr);
  const habitsChanged = migratedHabits !== habits;

  // 1. New badges
  const { earnable } = computeBadgesEarnable(days, migratedHabits, strict);
  const newBadges = [];
  for (const id of earnable) {
    if (!stored.includes(id)) newBadges.push(id);
  }

  // 2. Newly clean days → add 100 XP each
  const newCredits = [];
  let xpGain = 0;
  for (const k of Object.keys(days)) {
    if (credited.has(k)) continue;
    if (isDayClean(days[k], migratedHabits, k, strict)) {
      newCredits.push(k);
      xpGain += XP_PER_CLEAN_DAY;
    }
  }

  if (!habitsChanged && newBadges.length === 0 && newCredits.length === 0) return null;

  const out = Object.assign({}, data, {
    unlockedBadges: stored.concat(newBadges),
    creditedDays: Array.from(credited).concat(newCredits),
    lifetimeXP: lifetimeXP + xpGain,
    _justUnlocked: newBadges, // ephemeral, for UI toast
  });
  if (habitsChanged) out.habits = migratedHabits;
  return out;
}

// ══════ HARD DAY BUDGET ══════
export const HARD_DAYS_PER_MONTH = 2;

export function hardDaysThisMonth(days, refDateStr) {
  const yyyy = refDateStr.slice(0, 4);
  const mm = refDateStr.slice(5, 7);
  const prefix = yyyy + "-" + mm;
  let used = 0;
  for (const k of Object.keys(days)) {
    if (k.startsWith(prefix) && days[k] && days[k].hardDay) used++;
  }
  return used;
}

export function canToggleHardDay(days, dateStr, alreadyOn) {
  if (alreadyOn) return true;
  return hardDaysThisMonth(days, dateStr) < HARD_DAYS_PER_MONTH;
}
