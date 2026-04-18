import { useState, useEffect } from "react";
import { db, auth, provider, doc, getDoc, setDoc, signInWithPopup, onAuthStateChanged } from "./firebase";
import { DEF_HABITS, DEF_GOALS, argDate, niceDate } from "./config";

import PillTabs from "./components/PillTabs";
import YearStrip from "./components/YearStrip";
import HabitCalendarModal from "./components/HabitCalendarModal";

import Login from "./tabs/Login";
import DayTab from "./tabs/DayTab";
import WeekTab from "./tabs/WeekTab";
import MonthTab from "./tabs/MonthTab";
import LogTab from "./tabs/LogTab";
import GoalsTab from "./tabs/GoalsTab";
import SettingsTab from "./tabs/SettingsTab";

/* ══════ FIREBASE HOOKS (unchanged logic) ══════ */
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setL] = useState(true);
  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setL(false); }), []);
  return { user, loading };
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

/* ══════ APP ROOT ══════ */
export default function App() {
  const { user, loading: authLd } = useAuth();
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
  if (!user) return <Login onLogin={login} busy={busy} />;
  return <Tracker uid={user.uid} />;
}

/* ══════ TRACKER ══════ */
function Tracker({ uid }) {
  const { data, loading, save } = useData(uid);
  const [tab, setTab] = useState("day");
  const [dayOff, setDayOff] = useState(0);
  const [mOff, setMOff] = useState(0);
  const [habitModal, setHabitModal] = useState(null);

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

  // Overall streak + best
  let streak = 0, bestStreak = 0, cur = 0;
  for (let si = 0; si < 365; si++) {
    const sk = argDate(-si);
    const sx = days[sk];
    if (sx && sx.checks && habits.every(h => sx.checks[h.id])) {
      if (si === streak) streak++;
      cur++;
      if (cur > bestStreak) bestStreak = cur;
    } else {
      cur = 0;
    }
  }

  const tabs = [
    ["day", "DAY"],
    ["week", "WEEK"],
    ["month", "MONTH"],
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
        {tab === "log" && <LogTab logs={logs} setLogs={setLogs} today={today} />}
        {tab === "goals" && <GoalsTab goals={goals} setGoals={setGoals} />}
        {tab === "settings" && (
          <SettingsTab
            habits={habits} setHabits={setHabits}
            recurring={recurring} setRecurring={setRecurring}
            data={data} setDay={setDay} getDayData={getDayData}
            today={today} bulkSetDays={bulkSetDays}
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
    </div>
  );
}

/* ══════ HELPERS (for header) ══════ */
function getWeekNum(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}
function getQuarter(dateStr) {
  const m = parseInt(dateStr.split("-")[1]);
  return Math.ceil(m / 3);
}
