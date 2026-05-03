// Stats Flex page — animated big-number summary of everything.
// Numbers count up on mount via CountUp. Re-animates only when values
// change (not every render).

import TabHeader from "../components/TabHeader";
import LevelBar from "../components/LevelBar";
import CountUp from "../components/CountUp";
import BadgeWall from "../components/BadgeWall";
import { isDayClean, BADGES } from "../gamification";

function computeStats(days, habits) {
  let totalClean = 0, totalFullClean = 0;
  let bestStreak = 0, curStreak = 0;
  let totalTasksDone = 0, totalTasks = 0, totalChecks = 0;
  let firstActiveDate = null;
  let hardDaysUsed = 0;

  const keys = Object.keys(days).sort();
  for (const k of keys) {
    const d = days[k];
    const hasActivity = d && (
      (d.checks && Object.values(d.checks).some(Boolean)) ||
      (d.tasks && d.tasks.length > 0)
    );
    if (hasActivity && !firstActiveDate) firstActiveDate = k;

    // Two cleanness criteria computed in parallel:
    //   - habits-only (current default streak rule)
    //   - full (habits + tasks all done)
    const habitsClean = isDayClean(d, habits, k, false);
    const fullClean = isDayClean(d, habits, k, true);
    if (habitsClean) {
      totalClean++;
      curStreak++;
      if (curStreak > bestStreak) bestStreak = curStreak;
    } else {
      curStreak = 0;
    }
    if (fullClean) totalFullClean++;
    if (d) {
      if (d.tasks) {
        totalTasks += d.tasks.length;
        totalTasksDone += d.tasks.filter(t => t.done).length;
      }
      if (d.checks) {
        totalChecks += Object.values(d.checks).filter(Boolean).length;
      }
      if (d.hardDay) hardDaysUsed++;
    }
  }

  // Days tracking the app (since first activity)
  let daysTracked = 0;
  if (firstActiveDate) {
    const today = keys[keys.length - 1] || firstActiveDate;
    daysTracked = Math.max(1, Math.round(
      (new Date(today + "T12:00:00") - new Date(firstActiveDate + "T12:00:00")) / 86400000
    ) + 1);
  }

  return {
    totalClean,
    totalFullClean,
    bestStreak,
    totalTasksDone,
    totalTasks,
    totalChecks,
    hardDaysUsed,
    daysTracked,
  };
}

export default function StatsTab({ days, habits, today, levelInfo, badgeInfo, streak, claimNextLevel, monadImage }) {
  const stats = computeStats(days, habits);
  const lifetimeXP = levelInfo ? levelInfo.xp : 0;
  const badgesUnlocked = badgeInfo ? badgeInfo.totalUnlocked : 0;
  const badgesTotal = BADGES.length;

  const cleanRate = stats.daysTracked > 0
    ? Math.round((stats.totalClean / stats.daysTracked) * 100)
    : 0;

  return (
    <div>
      <TabHeader
        title="Stats"
        subtitle={`${stats.daysTracked} days tracked · ${cleanRate}% clean`}
        monadImage={monadImage}
      />

      {levelInfo && (
        <div style={{ marginBottom: 18 }}>
          <LevelBar levelInfo={levelInfo} onClaim={claimNextLevel} />
        </div>
      )}

      <div className="stats-flex-grid">
        <FlexStat label="CURRENT STREAK" value={streak} unit="d" tone="red" />
        <FlexStat label="BEST STREAK" value={stats.bestStreak} unit="d" tone="red" />
        <FlexStat label="HABITS CLEAN" value={stats.totalClean} tone="red"
          hint="Days every habit was checked" />
        <FlexStat label="FULL CLEAN" value={stats.totalFullClean} tone="red"
          hint="Habits + every task done" />
        <FlexStat label="DAYS TRACKED" value={stats.daysTracked} tone="plain" />
        <FlexStat label="TASKS SHIPPED" value={stats.totalTasksDone} tone="red" />
        <FlexStat label="TASKS TOTAL" value={stats.totalTasks} tone="plain" />
        <FlexStat label="HABIT CHECKS" value={stats.totalChecks} tone="plain" />
        <FlexStat label="LIFETIME XP" value={lifetimeXP} tone="red" />
        <FlexStat label="BADGES" value={badgesUnlocked} unit={"/" + badgesTotal} tone="red" />
        <FlexStat label="HARD DAYS USED" value={stats.hardDaysUsed} tone="plain" />
      </div>

      <div className="stats-rate">
        <div className="stats-rate-label">CLEAN RATE</div>
        <div className="stats-rate-track">
          <div className="stats-rate-fill" style={{ width: `${cleanRate}%` }} />
        </div>
        <div className="stats-rate-pct"><CountUp value={cleanRate} duration={1600} format={false} />%</div>
      </div>

      {/* Achievements wall */}
      {badgeInfo && <BadgeWall badgeInfo={badgeInfo} />}
    </div>
  );
}

function FlexStat({ label, value, unit, tone, hint }) {
  return (
    <div className="flex-stat" title={hint || ""}>
      <div className="flex-stat-label">{label}</div>
      <div className={`flex-stat-value ${tone === "red" ? "red" : "plain"}`}>
        <CountUp value={value} />
        {unit && <span className="flex-stat-unit">{unit}</span>}
      </div>
      {hint && <div className="flex-stat-hint">{hint}</div>}
    </div>
  );
}
