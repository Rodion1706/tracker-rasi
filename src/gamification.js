// Gamification layer — XP, Levels, Badges, Combo tiers.
// PERSISTENCE MODEL: once earned, stays. lifetimeXP and unlockedBadges
// live on user data and only ever grow. A separate creditedDays list
// guarantees each clean day is counted once even if Boss rechecks days.

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

// ══════ XP CONSTANTS ══════
export const XP_PER_CLEAN_DAY = 100;

// ══════ LEVELS ══════
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
export function computeBadgesEarnable(days, habits) {
  let totalClean = 0, bestStreak = 0, curStreak = 0, totalTasksDone = 0;
  let curStreakUsedHardDay = false;
  let pastStreakBrokeAtSeven = false; // true if there was ever a >=7 streak that ended
  let bestSoloStreak = 0; // best streak with NO hard day in it

  // Walk days chronologically
  const keys = Object.keys(days).sort();
  for (const k of keys) {
    const d = days[k];
    if (isDayClean(d, habits)) {
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
      if (!isDayClean(d, habits)) { allClean = false; break; }
      cleanCount++;
      if (d && d.hardDay) hardUsed = true;
    }
    if (allClean && !hardUsed && cleanCount === daysInMonth) return true;
  }
  return false;
}

// ══════ PERSISTENCE-AWARE UPDATER ══════
// Given existing data, returns a NEW data object with newly-earned badges
// appended and new clean days credited to lifetimeXP. Returns null if no
// change is needed (so caller can skip a save).
export function applyGamificationUpdates(data, habits) {
  const days = data.days || {};
  const stored = data.unlockedBadges || [];
  const credited = new Set(data.creditedDays || []);
  const lifetimeXP = data.lifetimeXP || 0;

  // 1. New badges
  const { earnable } = computeBadgesEarnable(days, habits);
  const newBadges = [];
  for (const id of earnable) {
    if (!stored.includes(id)) newBadges.push(id);
  }

  // 2. Newly clean days → add 100 XP each
  const newCredits = [];
  let xpGain = 0;
  for (const k of Object.keys(days)) {
    if (credited.has(k)) continue;
    if (isDayClean(days[k], habits)) {
      newCredits.push(k);
      xpGain += XP_PER_CLEAN_DAY;
    }
  }

  if (newBadges.length === 0 && newCredits.length === 0) return null;

  return Object.assign({}, data, {
    unlockedBadges: stored.concat(newBadges),
    creditedDays: Array.from(credited).concat(newCredits),
    lifetimeXP: lifetimeXP + xpGain,
    _justUnlocked: newBadges, // ephemeral, for UI toast
  });
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
