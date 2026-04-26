import { useState, useEffect } from "react";
import { db, auth, provider, doc, getDoc, setDoc, signInWithPopup, signOut, onAuthStateChanged } from "./firebase";
import { DEF_HABITS, DEF_GOALS, argDate, niceDate } from "./config";
import { isDayClean, getLevel, applyGamificationUpdates, BADGES } from "./gamification";
import { applyRollover } from "./rollover";
import { scheduleReminders } from "./notifications";

/* ══════ ACCESS CONTROL ══════ */
// Only these emails can sign in. Add more if needed.
const ALLOWED_EMAILS = ["radzivonlavyshwork@gmail.com"];

import PillTabs from "./components/PillTabs";
import YearStrip from "./components/YearStrip";
import HabitCalendarModal from "./components/HabitCalendarModal";
import BadgeToast from "./components/BadgeToast";
import RolloverToast from "./components/RolloverToast";
import FloatingAdd from "./components/FloatingAdd";

import Login from "./tabs/Login";
import DayTab from "./tabs/DayTab";
import WeekTab from "./tabs/WeekTab";
import MonthTab from "./tabs/MonthTab";
import LogTab from "./tabs/LogTab";
import GoalsTab from "./tabs/GoalsTab";
import SettingsTab from "./tabs/SettingsTab";
import StatsTab from "./tabs/StatsTab";

/* ══════ FIREBASE HOOKS ══════ */
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setL] = useState(true);
  const [denied, setDenied] = useState(null); // holds denied email when access refused
  useEffect(() => onAuthStateChanged(auth, async u => {
    if (u && !ALLOWED_EMAILS.includes((u.email || "").toLowerCase())) {
      setDenied(u.email || "unknown");
      setUser(null);
      try { await signOut(auth); } catch (e) { /* no-op */ }
    } else {
      setDenied(null);
      setUser(u);
    }
    setL(false);
  }), []);
  return { user, loading, denied, clearDenied: () => setDenied(null) };
}

function useData(uid) {
  const [d, setD] = useState({ days: {}, habits: null, recurring: [], goals: DEF_GOALS, logs: {} });
  const [ld, setLd] = useState(true);
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const s = await getDoc(doc(db, "users", uid));
        if (s.exists()) setD(prev => Object.assign({}, prev, s.data()));
      } catch (e) { /* no-op */ }
      setLd(false);
    })();
  }, [uid]);
  function save(nd) {
    setD(nd);
    if (uid) setDoc(doc(db, "users", uid), nd, { merge: true }).catch(() => {});
  }
  return { data: d, loading: ld, save };
}

/* ══════ KEYBOARD SHORTCUTS (desktop) ══════ */
// d / w / m / l / g / s → tab switch
// t → jump to today (day tab, dayOff=0)
// ← / → → prev/next day on Day tab
// n → focus add-task input
// Ignored when typing in inputs.
function useKeyboardShortcuts(setTab, setDayOff, tab) {
  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      switch (e.key) {
        case "d": setTab("day"); setDayOff(0); break;
        case "w": setTab("week"); break;
        case "m": setTab("month"); break;
        case "x": setTab("stats"); break;
        case "l": setTab("log"); break;
        case "g": setTab("goals"); break;
        case "s": setTab("settings"); break;
        case "t": setTab("day"); setDayOff(0); break;
        case "ArrowLeft":
          if (tab === "day") setDayOff(off => off - 1);
          break;
        case "ArrowRight":
          if (tab === "day") setDayOff(off => off + 1);
          break;
        case "n":
        case "/": {
          const input = document.querySelector(".add-input");
          if (input) { input.focus(); e.preventDefault(); }
          break;
        }
        default: return;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTab, setDayOff, tab]);
}

/* ══════ APP ROOT ══════ */
export default function App() {
  const { user, loading: authLd, denied, clearDenied } = useAuth();
  const [busy, setBusy] = useState(false);

  async function login() {
    setBusy(true);
    try { await signInWithPopup(auth, provider); } catch (e) { /* no-op */ }
    setBusy(false);
  }

  if (authLd) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--t3)", fontSize: 13, letterSpacing: "0.2em", fontFamily: "'Cinzel', serif" }}>
          loading…
        </div>
      </div>
    );
  }
  if (denied) return <AccessDenied email={denied} onRetry={clearDenied} />;
  if (!user) return <Login onLogin={login} busy={busy} />;
  return <Tracker uid={user.uid} />;
}

/* ══════ ACCESS DENIED SCREEN ══════ */
function AccessDenied({ email, onRetry }) {
  return (
    <div style={{
      background: "var(--bg)",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      position: "relative",
      textAlign: "center",
    }}>
      <div className="top-strip" />
      <div style={{
        fontFamily: "'Oswald', sans-serif",
        fontSize: 38,
        fontWeight: 700,
        letterSpacing: "0.24em",
        color: "var(--red)",
        textShadow: "0 0 18px var(--red)",
        marginBottom: 18,
      }}>ACCESS DENIED</div>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        color: "var(--t2)",
        letterSpacing: "0.08em",
        marginBottom: 8,
        wordBreak: "break-all",
        maxWidth: 420,
      }}>{email}</div>
      <div style={{
        fontFamily: "'Cinzel', serif",
        fontSize: 12,
        color: "var(--t3)",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        marginBottom: 36,
      }}>not on the allowlist</div>
      <div
        onClick={onRetry}
        style={{
          padding: "12px 30px",
          background: "rgba(232, 16, 42, 0.1)",
          color: "var(--red)",
          borderRadius: 10,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.2em",
          border: "1px solid rgba(232, 16, 42, 0.4)",
          fontFamily: "'Cinzel', serif",
          textTransform: "uppercase",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(232, 16, 42, 0.2)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(232, 16, 42, 0.35)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(232, 16, 42, 0.1)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        TRY ANOTHER ACCOUNT
      </div>
    </div>
  );
}

/* ══════ TRACKER ══════ */
function Tracker({ uid }) {
  const { data, loading, save } = useData(uid);
  const [tab, setTab] = useState("day");
  const [dayOff, setDayOff] = useState(0);
  const [mOff, setMOff] = useState(0);
  const [habitModal, setHabitModal] = useState(null);

  useKeyboardShortcuts(setTab, setDayOff, tab);

  // Re-push the notification schedule to the SW on every app load.
  // Internal helper bails out when notifications are disabled or
  // permission isn't granted.
  useEffect(() => {
    scheduleReminders().catch(() => {});
  }, []);

  const today = argDate(0);
  const habits = data.habits || DEF_HABITS;
  const goals = data.goals || DEF_GOALS;
  const recurring = data.recurring || [];
  const days = data.days || {};
  const logs = data.logs || {};

  function setHabits(h) { save(Object.assign({}, data, { habits: h })); }
  function setGoals(g) { save(Object.assign({}, data, { goals: g })); }
  function setRecurring(r) { save(Object.assign({}, data, { recurring: r })); }
  function setLogs(l) { save(Object.assign({}, data, { logs: l })); }
  function setDay(key, val) {
    const nd = Object.assign({}, data);
    nd.days = Object.assign({}, nd.days);
    nd.days[key] = val;
    save(nd);
  }
  function bulkSetDays(updates) {
    const nd = Object.assign({}, data);
    nd.days = Object.assign({}, nd.days, updates);
    save(nd);
  }

  function getDayData(key) {
    const dd = days[key] || { checks: {}, tasks: [] };
    if (!dd.checks) dd.checks = {};
    if (!dd.tasks) dd.tasks = [];
    return dd;
  }

  // Overall streak + best.
  // Streak: consecutive clean days ending yesterday. If today is ALREADY
  // clean, include it. In-progress today does NOT break the streak.
  // Clean = every habit checked OR day marked as Hard Day.
  const isClean = key => isDayClean(days[key], habits, key);
  let streak = 0;
  const todayClean = isClean(argDate(0));
  const startOffset = todayClean ? 0 : 1;
  for (let si = startOffset; si < 365; si++) {
    if (isClean(argDate(-si))) streak++;
    else break;
  }
  // Best streak: longest clean run in the last 365 days.
  let bestStreak = 0, cur = 0;
  for (let si = 0; si < 365; si++) {
    if (isClean(argDate(-si))) {
      cur++;
      if (cur > bestStreak) bestStreak = cur;
    } else {
      cur = 0;
    }
  }

  // XP + Level + Badges — PERSISTED on data (never lost once earned).
  // Effect below banks any newly clean days + newly earned badges into
  // data.lifetimeXP and data.unlockedBadges.
  const lifetimeXP = data.lifetimeXP || 0;
  const levelInfo = getLevel(lifetimeXP);
  const unlockedBadges = data.unlockedBadges || [];
  const badgeInfo = {
    unlocked: new Set(unlockedBadges),
    totalUnlocked: unlockedBadges.length,
    totalAvailable: BADGES.length,
  };
  const justUnlocked = data._justUnlocked || [];
  // Run the gamification update pass when days/habits/data change.
  // Also migrates habits without createdAt on first run.
  useEffect(() => {
    if (loading) return;
    const next = applyGamificationUpdates(data, habits, today);
    if (next) save(next);
  }, [days, habits, loading]);

  // Auto-rollover unchecked tasks from yesterday → today (one-shot per
  // calendar day). Tracked via data._lastRolloverDay so it never repeats.
  const [rolloverInfo, setRolloverInfo] = useState(null);
  useEffect(() => {
    if (loading) return;
    if (data._lastRolloverDay === today) return;
    const result = applyRollover(data);
    const stamped = Object.assign({}, result ? result.nextData : data, { _lastRolloverDay: today });
    save(stamped);
    if (result && (result.rolled > 0 || result.dropped.length > 0)) {
      setRolloverInfo({ rolled: result.rolled, dropped: result.dropped });
      const t = setTimeout(() => setRolloverInfo(null), 7000);
      return () => clearTimeout(t);
    }
  }, [loading, today]);
  // Clear the _justUnlocked flag once the toast has had a chance to render.
  useEffect(() => {
    if (justUnlocked.length === 0) return;
    const t = setTimeout(() => {
      const cleared = Object.assign({}, data);
      delete cleared._justUnlocked;
      save(cleared);
    }, 5000);
    return () => clearTimeout(t);
  }, [justUnlocked.length]);

  const tabs = [
    ["day", "DAY"],
    ["week", "WEEK"],
    ["month", "MONTH"],
    ["stats", "STATS"],
    ["log", "LOG"],
    ["goals", "GOALS"],
    ["settings", "SET"],
  ];

  if (loading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--t3)", fontSize: 13, letterSpacing: "0.2em", fontFamily: "'Cinzel', serif" }}>
          loading…
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="top-strip" />

      <div className="app">
        {/* Header */}
        <div className="top-header">
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div className="brand-katakana">ロディオン</div>
            <div className="brand-sub">Command · Center</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="date-main">
              {niceDate(today).toUpperCase()}
            </div>
            <div className="date-sub">
              W{getWeekNum(today)} · Q{getQuarter(today)} · {today.split("-")[0]}
            </div>
          </div>
        </div>

        {/* Pill tabs */}
        <PillTabs
          tabs={tabs}
          active={tab}
          onChange={id => { setTab(id); if (id === "day") setDayOff(0); }}
        />

        {/* Year strip (only on Day/Week for focus) */}
        {(tab === "day" || tab === "week") && <YearStrip today={today} />}

        {/* Main content */}
        {tab === "day" && (
          <DayTab
            days={days} habits={habits} today={today}
            dayOff={dayOff} setDayOff={setDayOff}
            setDay={setDay} getDayData={getDayData}
            streak={streak} bestStreak={bestStreak}
            recurring={recurring}
            openHabitModal={h => setHabitModal(h)}
            levelInfo={levelInfo} badgeInfo={badgeInfo}
            celebratedThresholds={data.celebratedThresholds || []}
            markThresholdCelebrated={n => save(Object.assign({}, data, {
              celebratedThresholds: (data.celebratedThresholds || []).concat([n])
            }))}
            bannerPhrases={data.bannerPhrases || []}
          />
        )}
        {tab === "week" && (
          <WeekTab
            days={days} habits={habits} today={today}
            dayOff={dayOff} setDayOff={setDayOff}
            setTab={setTab}
          />
        )}
        {tab === "month" && (
          <MonthTab
            days={days} habits={habits} today={today}
            mOff={mOff} setMOff={setMOff}
            setDayOff={setDayOff} setTab={setTab}
          />
        )}
        {tab === "stats" && (
          <StatsTab
            days={days} habits={habits} today={today}
            levelInfo={levelInfo} badgeInfo={badgeInfo}
            streak={streak}
          />
        )}
        {tab === "log" && <LogTab logs={logs} setLogs={setLogs} today={today} />}
        {tab === "goals" && <GoalsTab goals={goals} setGoals={setGoals} />}
        {tab === "settings" && (
          <SettingsTab
            habits={habits} setHabits={setHabits}
            recurring={recurring} setRecurring={setRecurring}
            data={data} setDay={setDay} getDayData={getDayData}
            today={today} bulkSetDays={bulkSetDays}
            badgeInfo={badgeInfo} levelInfo={levelInfo}
            bannerPhrases={data.bannerPhrases || []}
            setBannerPhrases={p => save(Object.assign({}, data, { bannerPhrases: p }))}
            hardModeOn={!!data.hardModeOn}
            setHardModeOn={v => save(Object.assign({}, data, { hardModeOn: v }))}
            jumpToDay={dateKey => {
              const offset = Math.round(
                (new Date(dateKey + "T12:00:00") - new Date(today + "T12:00:00")) / 86400000
              );
              setDayOff(offset);
              setTab("day");
            }}
          />
        )}

        {/* Footer */}
        <div className="app-footer">SUBTRACTION IS THE STRATEGY</div>
      </div>

      {/* Habit calendar modal */}
      {habitModal && (
        <HabitCalendarModal
          habit={habitModal}
          days={days}
          today={today}
          onClose={() => setHabitModal(null)}
        />
      )}

      {/* Badge unlock toast */}
      <BadgeToast badgeIds={justUnlocked} />

      {/* Yesterday's rollover toast */}
      <RolloverToast info={rolloverInfo} />

      {/* Floating + (mobile only via CSS) — quick scroll-to-input on Day tab */}
      {tab === "day" && <FloatingAdd />}
    </div>
  );
}

/* ══════ HELPERS (for header) ══════ */
function getWeekNum(dateStr) {
  // ISO 8601 week number — matches getWeekId in config.js
  const src = new Date(dateStr + "T12:00:00");
  const d = new Date(Date.UTC(src.getFullYear(), src.getMonth(), src.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
function getQuarter(dateStr) {
  const m = parseInt(dateStr.split("-")[1]);
  return Math.ceil(m / 3);
}
