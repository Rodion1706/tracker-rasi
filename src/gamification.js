// Gamification layer — XP, Levels, Badges, Combo tiers.
// Everything derived from the days map + habits list so there's
// no separate state to migrate or corrupt; truth lives in day data.

import { argDate } from "./config";

// ══════ CORE: day cleanness (shared with streak logic) ══════
// A day counts as "clean" when every habit is checked OR the user
// explicitly marked it a Hard Day.
export function isDayClean(dayData, habits) {
  if (!dayData || !habits || habits.length === 0) return false;
  if (dayData.hardDay) return true;
  if (!dayData.checks) return false;
  return habits.every(h => dayData.checks[h.id]);
}

// ══════ XP ══════
// 100 XP per clean day. Dead simple, matches Boss's mental model
// ("clean day = achievement unit"). Bonus multiplier kicks in at
// longer streaks so consistency compounds.
export function computeXP(days, habits) {
  let xp = 0;
  const keys = Object.keys(days).sort(); // chronological
  let runningStreak = 0;
  for (const k of keys) {
    if (isDayClean(days[k], habits)) {
      runningStreak++;
      const dayXP = 100;
      // Streak bonus: +10% per 7-day block, capped at +100% (50 days)
      const bonusBlocks = Math.min(Math.floor(runningStreak / 7), 10);
      const bonus = Math.floor(dayXP * (bonusBlocks * 0.1));
      xp += dayXP + bonus;
    } else {
      runningStreak = 0;
    }
  }
  return xp;
}

// ══════ LEVELS ══════
// Doubling-ish thresholds so each new level feels meaningfully harder.
// Names from monk/warrior aesthetic that matches the dark theme.
export const LEVELS = [
  { id: 1, name: "INITIATE",     threshold: 0 },
  { id: 2, name: "DISCIPLINED",  threshold: 500 },
  { id: 3, name: "SHARPENED",    threshold: 1500 },
  { id: 4, name: "FORGED",       threshold: 3500 },
  { id: 5, name: "OBSESSED",     threshold: 7000 },
  { id: 6, name: "MONK",         threshold: 12000 },
  { id: 7, name: "RELENTLESS",   threshold: 20000 },
  { id: 8, name: "UNTOUCHABLE",  threshold: 32000 },
  { id: 9, name: "LEGENDARY",    threshold: 50000 },
  { id: 10, name: "ASCENDED",    threshold: 80000 },
];

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

// ══════ COMBO TIER (celebration escalation) ══════
// Bigger streak → bigger payload when closing a day.
export function celebrationTier(streakAfterClose) {
  if (streakAfterClose >= 100) return { tier: 5, label: "CENTURY" };
  if (streakAfterClose >= 30)  return { tier: 4, label: "MONTH CLEAN" };
  if (streakAfterClose >= 14)  return { tier: 3, label: "FORTNIGHT" };
  if (streakAfterClose >= 7)   return { tier: 2, label: "WEEK CLEAN" };
  return { tier: 1, label: null };
}

// ══════ BADGES ══════
// Derived from days + habits. Once earned, they show as unlocked.
// Order here = display order.
export const BADGES = [
  { id: "first-spark",   name: "FIRST SPARK",   desc: "Close your first clean day" },
  { id: "chain",         name: "CHAIN",         desc: "3-day streak" },
  { id: "week-clear",    name: "WEEK CLEAR",    desc: "7-day streak" },
  { id: "fortnight",     name: "FORTNIGHT",     desc: "14-day streak" },
  { id: "month-iron",    name: "MONTH IRON",    desc: "30-day streak" },
  { id: "half-hundred",  name: "50 DAYS",       desc: "50-day streak" },
  { id: "relic",         name: "RELIC",         desc: "100-day streak" },
  { id: "ten",           name: "10 CLEAN",      desc: "10 clean days total" },
  { id: "fifty",         name: "50 CLEAN",      desc: "50 clean days total" },
  { id: "hundred",       name: "100 CLEAN",     desc: "100 clean days total" },
  { id: "task-100",      name: "100 SHIPPED",   desc: "100 tasks completed" },
  { id: "task-500",      name: "500 SHIPPED",   desc: "500 tasks completed" },
];

export function computeBadges(days, habits) {
  // Tally clean days + best streak + total tasks done
  let totalClean = 0, bestStreak = 0, curStreak = 0, totalTasksDone = 0;
  const keys = Object.keys(days).sort();
  for (const k of keys) {
    const d = days[k];
    if (isDayClean(d, habits)) {
      totalClean++;
      curStreak++;
      if (curStreak > bestStreak) bestStreak = curStreak;
    } else {
      curStreak = 0;
    }
    if (d && d.tasks) {
      totalTasksDone += d.tasks.filter(t => t.done).length;
    }
  }

  const unlocked = new Set();
  if (totalClean >= 1)   unlocked.add("first-spark");
  if (bestStreak >= 3)   unlocked.add("chain");
  if (bestStreak >= 7)   unlocked.add("week-clear");
  if (bestStreak >= 14)  unlocked.add("fortnight");
  if (bestStreak >= 30)  unlocked.add("month-iron");
  if (bestStreak >= 50)  unlocked.add("half-hundred");
  if (bestStreak >= 100) unlocked.add("relic");
  if (totalClean >= 10)  unlocked.add("ten");
  if (totalClean >= 50)  unlocked.add("fifty");
  if (totalClean >= 100) unlocked.add("hundred");
  if (totalTasksDone >= 100) unlocked.add("task-100");
  if (totalTasksDone >= 500) unlocked.add("task-500");

  return { unlocked, totalClean, bestStreak, totalTasksDone };
}

// ══════ HARD DAY BUDGET ══════
// 2 per calendar month. Counts both toggled days (past + today).
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
  if (alreadyOn) return true; // can always turn off
  return hardDaysThisMonth(days, dateStr) < HARD_DAYS_PER_MONTH;
}
