import { useState, useEffect, useRef } from "react";
import { db, auth, provider, doc, getDoc, setDoc, serverTimestamp, FieldPath, signInWithPopup, signOut, onAuthStateChanged } from "./firebase";
import { DEF_HABITS, DEF_GOALS, DEF_TAGS, argDate, niceDate } from "./config";
import { isDayClean, getLevel, getDisplayLevel, applyGamificationUpdates, BADGES } from "./gamification";
import { applyRollover } from "./rollover";
import { scheduleReminders } from "./notifications";

/* ══════ ACCESS CONTROL ══════ */
// Only these emails can sign in. Add more if needed.
const ALLOWED_EMAILS = ["radzivonlavyshwork@gmail.com", "dmytro.merzliakov@gmail.com"];
const LOCAL_PREVIEW_UID = "__local_preview__";
const LOCAL_PREVIEW_STORAGE_KEY = "command-center-local-preview";

function emptyData() {
  return { days: {}, habits: null, recurring: [], goals: DEF_GOALS, logs: {} };
}

function normalizeData(remote) {
  return Object.assign(emptyData(), remote || {});
}

function formatFirebaseError(e) {
  const code = e && e.code ? e.code : "unknown";
  if (code === "permission-denied") return "Firestore denied access for this Google account.";
  if (code === "unavailable") return "Firestore is temporarily unavailable. Try again in a moment.";
  if (code === "unauthenticated") return "Google session expired. Sign out and sign in again.";
  return "Could not sync with Firestore. Code: " + code;
}

function dayCount(data) {
  return Object.keys((data && data.days) || {}).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).length;
}

function makeWriteId() {
  return Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

function patchFieldCount(patch) {
  return Object.keys(patch || {}).length;
}

function mergeFieldsForPatch(patch) {
  const fields = [];
  for (const key of Object.keys(patch || {})) {
    if (key === "days" && patch.days && typeof patch.days === "object" && !Array.isArray(patch.days)) {
      for (const dayKey of Object.keys(patch.days)) fields.push(new FieldPath("days", dayKey));
    } else {
      fields.push(key);
    }
  }
  return fields;
}

import PillTabs from "./components/PillTabs";
import YearStrip from "./components/YearStrip";
import HabitCalendarModal from "./components/HabitCalendarModal";
import BadgeToast from "./components/BadgeToast";
import RolloverToast from "./components/RolloverToast";
import FloatingAdd from "./components/FloatingAdd";
import LevelClaim from "./components/LevelClaim";
import { LEVELS } from "./gamification";

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
      setL(false);
      try { await signOut(auth); } catch (e) { /* no-op */ }
      return;
    }
    if (u) {
      setDenied(null);
      setUser(u);
    } else {
      setUser(null);
    }
    setL(false);
  }), []);
  return { user, loading, denied, clearDenied: () => setDenied(null) };
}

function useData(uid) {
  const [d, setD] = useState(emptyData);
  const [ld, setLd] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [dataSource, setDataSource] = useState("loading");
  const dataRef = useRef(d);
  const readyRef = useRef(false);
  const errorRef = useRef(null);
  const writeSeqRef = useRef(0);
  const writeChainRef = useRef(Promise.resolve());
  const writeFailureRef = useRef(false);
  const savedTimerRef = useRef(null);
  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);
  useEffect(() => {
    dataRef.current = d;
  }, [d]);
  useEffect(() => {
    let cancelled = false;
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    readyRef.current = false;
    errorRef.current = null;
    writeSeqRef.current += 1;
    writeChainRef.current = Promise.resolve();
    writeFailureRef.current = false;
    setLd(true);
    setLoadError(null);
    setSyncError(null);
    setSaveStatus("idle");
    setDataSource("loading");
    setD(emptyData());
    if (!uid) {
      setLd(false);
      return () => { cancelled = true; };
    }
    if (uid === LOCAL_PREVIEW_UID) {
      try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_PREVIEW_STORAGE_KEY) || "null");
        if (cancelled) return;
        const next = normalizeData(stored);
        setD(next);
        dataRef.current = next;
      } catch (e) { /* no-op */ }
      readyRef.current = true;
      setDataSource("local-preview");
      setLd(false);
      return () => { cancelled = true; };
    }
    (async () => {
      try {
        const s = await getDoc(doc(db, "users", uid));
        if (cancelled) return;
        const next = s.exists() ? normalizeData(s.data()) : emptyData();
        setD(next);
        dataRef.current = next;
        readyRef.current = true;
        setDataSource(s.exists() ? "remote-existing" : "remote-new");
      } catch (e) {
        if (cancelled) return;
        const message = formatFirebaseError(e);
        errorRef.current = message;
        setLoadError(message);
        setDataSource("error");
      } finally {
        if (!cancelled) setLd(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  function markSaved(writeNumber) {
    if (writeNumber !== writeSeqRef.current) return;
    setSaveStatus("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      if (writeNumber === writeSeqRef.current) setSaveStatus("idle");
    }, 1800);
  }

  function markFailed(_writeNumber, e) {
    writeFailureRef.current = true;
    setSaveStatus("error");
    setSyncError(formatFirebaseError(e));
  }

  function sendPatch(userRef, remotePatch, mergeFields, attempt) {
    return setDoc(userRef, remotePatch, { mergeFields }).catch(e => {
      if (attempt < 2) {
        return new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)))
          .then(() => sendPatch(userRef, remotePatch, mergeFields, attempt + 1));
      }
      throw e;
    });
  }

  function saveComputed(compute) {
    if (!uid || !readyRef.current || errorRef.current) return;
    const prev = dataRef.current;
    const result = compute(prev);
    if (!result || !result.nextData || result.nextData === prev || !patchFieldCount(result.patch)) return;
    const nd = result.nextData;
    const prevDays = dayCount(prev);
    const nextDays = dayCount(nd);
    if (prevDays > 0 && nextDays === 0) {
      setSyncError("Blocked a write that would clear all tracked days.");
      setSaveStatus("error");
      return;
    }
    dataRef.current = nd;
    setD(nd);
    if (!writeFailureRef.current) setSyncError(null);
    const writeNumber = writeSeqRef.current + 1;
    writeSeqRef.current = writeNumber;
    if (uid === LOCAL_PREVIEW_UID) {
      try { localStorage.setItem(LOCAL_PREVIEW_STORAGE_KEY, JSON.stringify(nd)); } catch (e) { /* no-op */ }
      markSaved(writeNumber);
      return;
    }
    setSaveStatus("saving");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    const remotePatch = Object.assign({}, result.patch, {
      schemaVersion: 2,
      updatedAt: serverTimestamp(),
      lastWriteId: makeWriteId(),
    });
    const userRef = doc(db, "users", uid);
    const mergeFields = mergeFieldsForPatch(remotePatch);
    const writeTask = writeChainRef.current
      .catch(() => {})
      .then(() => sendPatch(userRef, remotePatch, mergeFields, 0));
    writeChainRef.current = writeTask.catch(() => {});
    writeTask.then(() => {
      if (writeNumber === writeSeqRef.current && !writeFailureRef.current) {
        setSyncError(null);
        markSaved(writeNumber);
      }
    }).catch(e => {
      markFailed(writeNumber, e);
    });
  }

  function saveFields(patchOrFn) {
    saveComputed(prev => {
      const patch = typeof patchOrFn === "function" ? patchOrFn(prev) : patchOrFn;
      if (!patchFieldCount(patch)) return null;
      return { nextData: Object.assign({}, prev, patch), patch };
    });
  }

  function saveDay(key, val) {
    saveComputed(prev => {
      const prevDays = prev.days || {};
      const prevDay = prevDays[key] || { checks: {}, tasks: [] };
      const nextDay = typeof val === "function" ? val(prevDay) : val;
      if (nextDay === prevDay) return null;
      return {
        nextData: Object.assign({}, prev, { days: Object.assign({}, prevDays, { [key]: nextDay }) }),
        patch: { days: { [key]: nextDay } },
      };
    });
  }

  function saveDays(updates) {
    if (!patchFieldCount(updates)) return;
    saveComputed(prev => {
      const prevDays = prev.days || {};
      return {
        nextData: Object.assign({}, prev, { days: Object.assign({}, prevDays, updates) }),
        patch: { days: updates },
      };
    });
  }

  return { data: d, loading: ld, loadError, syncError, saveStatus, dataSource, saveFields, saveDay, saveDays, saveComputed };
}

/* ══════ KEYBOARD SHORTCUTS (desktop) ══════ */
// d / w / m / l / g / s → tab switch
// t → jump to today (day tab, dayOff=0)
// ← / → → prev/next day on Day tab
// n → focus add-task input
// Ignored when typing in inputs.
function useKeyboardShortcuts(setTab, setDayOff, tab, visibleIds) {
  useEffect(() => {
    function onKey(e) {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Skip shortcut if tab is currently hidden via Settings toggle.
      const goto = id => { if (visibleIds.includes(id)) setTab(id); };
      switch (e.key) {
        case "d": setTab("day"); setDayOff(0); break;
        case "w": goto("week"); break;
        case "m": goto("month"); break;
        case "x": goto("stats"); break;
        case "l": goto("log"); break;
        case "g": goto("goals"); break;
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
  }, [setTab, setDayOff, tab, visibleIds.join(",")]);
}

/* ══════ APP ROOT ══════ */
export default function App() {
  const { user, loading: authLd, denied, clearDenied } = useAuth();
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [localPreview, setLocalPreview] = useState(false);
  const canLocalPreview = import.meta.env.DEV && ["localhost", "127.0.0.1"].includes(window.location.hostname);

  async function login() {
    setBusy(true);
    setLoginError("");
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const code = e && e.code ? e.code : "";
      if (code === "auth/popup-closed-by-user") {
        setLoginError("Google window closed before sign-in finished.");
      } else if (code === "auth/popup-blocked") {
        setLoginError("Popup was blocked. Allow popups for this tracker and try again.");
      } else if (code === "auth/unauthorized-domain") {
        setLoginError("This domain is not allowed in Firebase Auth settings.");
      } else {
        setLoginError("Sign-in failed. Try again or use the allowed Google account.");
      }
    }
    setBusy(false);
  }
  async function logout() {
    setLoginError("");
    setLocalPreview(false);
    try { await signOut(auth); } catch (e) { /* no-op */ }
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
  if (denied) return <AccessDenied email={denied} onRetry={() => { clearDenied(); setLoginError(""); }} />;
  if (localPreview) return <Tracker uid={LOCAL_PREVIEW_UID} accountEmail="Local preview" accountMode="local" onLogout={() => setLocalPreview(false)} />;
  if (!user) return <Login onLogin={login} busy={busy} error={loginError} canLocalPreview={canLocalPreview} onLocalPreview={() => { setLoginError(""); setLocalPreview(true); }} />;
  return <Tracker uid={user.uid} accountEmail={user.email || ""} accountMode="google" onLogout={logout} />;
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
          background: "rgba(var(--accent-rgb), 0.1)",
          color: "var(--red)",
          borderRadius: 10,
          cursor: "pointer",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.2em",
          border: "1px solid rgba(var(--accent-rgb), 0.4)",
          fontFamily: "'Cinzel', serif",
          textTransform: "uppercase",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(var(--accent-rgb), 0.2)"; e.currentTarget.style.boxShadow = "0 0 24px rgba(var(--accent-rgb), 0.35)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(var(--accent-rgb), 0.1)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        TRY ANOTHER ACCOUNT
      </div>
    </div>
  );
}

function DataLoadError({ message, onRetry, onLogout }) {
  return (
    <div style={{
      background: "var(--bg)",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 22,
      textAlign: "center",
    }}>
      <div className="top-strip" />
      <div style={{
        fontFamily: "'Oswald', sans-serif",
        fontSize: 34,
        fontWeight: 700,
        letterSpacing: "0.22em",
        color: "var(--red)",
        marginBottom: 16,
      }}>SYNC BLOCKED</div>
      <div style={{
        maxWidth: 460,
        color: "var(--t2)",
        fontSize: 12,
        lineHeight: 1.7,
        letterSpacing: "0.08em",
        fontFamily: "'JetBrains Mono', monospace",
        marginBottom: 24,
      }}>
        {message || "Could not load tracker data. Writes are blocked so history cannot be overwritten by an empty state."}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <div onClick={onRetry} className="add-btn">RETRY</div>
        <div onClick={onLogout} className="add-btn" style={{ background: "rgba(var(--accent-rgb), 0.06)" }}>SIGN OUT</div>
      </div>
    </div>
  );
}

/* ══════ TRACKER ══════ */
function Tracker({ uid, accountEmail, accountMode, onLogout }) {
  const { data, loading, loadError, syncError, saveStatus, dataSource, saveFields, saveDay, saveDays, saveComputed } = useData(uid);
  const [tab, setTab] = useState("day");
  const [dayOff, setDayOff] = useState(0);
  const [mOff, setMOff] = useState(0);
  const [habitModal, setHabitModal] = useState(null);

  // Tab visibility (Settings → TABS). Day / Month / Log are always
  // shown. Settings is opened by the floating gear so tabs stay compact.
  const tabVisibility = data.tabVisibility || {};
  const allTabs = [
    ["day", "DAY", "always"],
    ["week", "WEEK", "optional"],
    ["month", "MONTH", "always"],
    ["stats", "STATS", "optional"],
    ["log", "LOG", "always"],
    ["goals", "GOALS", "optional"],
  ];
  const tabs = allTabs
    .filter(([id, , kind]) => kind === "always" || tabVisibility[id])
    .map(([id, label]) => [id, label]);
  const visibleTabIds = tabs.map(([id]) => id);

  useKeyboardShortcuts(setTab, setDayOff, tab, visibleTabIds);

  // If an optional tab gets toggled off in Settings, fall back to Day.
  // Settings itself is a floating-button route, not a pill tab.
  useEffect(() => {
    if (tab !== "settings" && !visibleTabIds.includes(tab)) {
      setTab("day");
      setDayOff(0);
    }
  }, [visibleTabIds.join(",")]);

  // Re-push the notification schedule to the SW on every app load.
  // Internal helper bails out when notifications are disabled or
  // permission isn't granted.
  useEffect(() => {
    scheduleReminders().catch(() => {});
  }, []);

  // Apply theme (Command Center / Seal Day / Seal Night) to <html>.
  // CSS variables on [data-theme="..."] override the :root defaults.
  // Default = "command" (no attribute set, falls back to :root).
  useEffect(() => {
    const theme = data.theme || "command";
    if (theme === "command") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [data.theme]);

  const today = argDate(0);
  const habits = data.habits || DEF_HABITS;
  const goals = data.goals || DEF_GOALS;
  const recurring = data.recurring || [];
  const tags = data.tags || DEF_TAGS;
  const days = data.days || {};
  const logs = data.logs || {};
  const monadImage = data.monadImage || { variant: "original" };

  function setHabits(h) { saveFields({ habits: h }); }
  function setGoals(g) { saveFields({ goals: g }); }
  function setRecurring(r) { saveFields({ recurring: r }); }
  function setLogs(l) { saveFields({ logs: l }); }
  function setTags(t) { saveFields({ tags: t }); }

  // Rename a tag: update the entry in tags AND sweep every task and
  // recurring item that references the old name. Past data included —
  // a renamed tag is still "the same tag", just with a new label.
  function renameTag(id, newName, newColor) {
    const trimmed = newName.trim();
    saveComputed(prev => {
      const prevTags = prev.tags || DEF_TAGS;
      const old = prevTags.find(t => t.id === id);
      if (!old) return null;
      const nextTags = prevTags.map(t => t.id === id ? Object.assign({}, t, { name: trimmed, color: newColor }) : t);
      const patch = { tags: nextTags };
      const nextData = Object.assign({}, prev, { tags: nextTags });
      if (old.name !== trimmed) {
        const dayUpdates = {};
        const prevDays = prev.days || {};
        for (const k of Object.keys(prevDays)) {
          const dd = prevDays[k];
          if (!dd || !dd.tasks) continue;
          let touched = false;
          const nextTasks = dd.tasks.map(t => {
            if (t && t.tag === old.name) { touched = true; return Object.assign({}, t, { tag: trimmed }); }
            return t;
          });
          if (touched) dayUpdates[k] = Object.assign({}, dd, { tasks: nextTasks });
        }
        const nextRecurring = (prev.recurring || []).map(r => r && r.tag === old.name ? Object.assign({}, r, { tag: trimmed }) : r);
        patch.recurring = nextRecurring;
        nextData.recurring = nextRecurring;
        if (patchFieldCount(dayUpdates)) {
          patch.days = dayUpdates;
          nextData.days = Object.assign({}, prevDays, dayUpdates);
        }
      }
      return { nextData, patch };
    });
  }

  // Delete a tag: drop from tags, strip the tag string from tasks ONLY
  // on today + future days. Past days keep the orphan string so the
  // historical record stays honest. Recurring items always feed future
  // days, so we strip the tag there too.
  function deleteTag(id) {
    saveComputed(prev => {
      const prevTags = prev.tags || DEF_TAGS;
      const old = prevTags.find(t => t.id === id);
      if (!old) return null;
      const nextTags = prevTags.filter(t => t.id !== id);
      const patch = { tags: nextTags };
      const nextData = Object.assign({}, prev, { tags: nextTags });
      const dayUpdates = {};
      const prevDays = prev.days || {};
      for (const k of Object.keys(prevDays)) {
        if (k < today) continue;
        const dd = prevDays[k];
        if (!dd || !dd.tasks) continue;
        let touched = false;
        const nextTasks = dd.tasks.map(t => {
          if (t && t.tag === old.name) { touched = true; return Object.assign({}, t, { tag: "" }); }
          return t;
        });
        if (touched) dayUpdates[k] = Object.assign({}, dd, { tasks: nextTasks });
      }
      const nextRecurring = (prev.recurring || []).map(r => r && r.tag === old.name ? Object.assign({}, r, { tag: "" }) : r);
      patch.recurring = nextRecurring;
      nextData.recurring = nextRecurring;
      if (patchFieldCount(dayUpdates)) {
        patch.days = dayUpdates;
        nextData.days = Object.assign({}, prevDays, dayUpdates);
      }
      return { nextData, patch };
    });
  }

  // How many today+future tasks reference a tag (used by the delete confirm dialog).
  function countTagUsage(name) {
    let n = 0;
    const dd = data.days || {};
    for (const k of Object.keys(dd)) {
      if (k < today) continue;
      const day = dd[k];
      if (!day || !day.tasks) continue;
      for (const t of day.tasks) if (t && t.tag === name) n++;
    }
    return n;
  }
  function setDay(key, val) {
    saveDay(key, val);
  }
  function bulkSetDays(updates) {
    saveDays(updates);
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
  // Clean = every habit checked OR day marked as Hard Day. With Strict
  // Streak on (data.strictStreak), also requires every task done.
  const strictStreak = !!data.strictStreak;
  const isClean = key => isDayClean(days[key], habits, key, strictStreak);
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

  // How many of the current streak are Hard Days (not actually 100%
  // checked, just protected). Lets the UI show "5d (incl 2 hard)".
  let hardInStreak = 0;
  for (let si = todayClean ? 0 : 1, count = 0; count < streak; si++) {
    const k = argDate(-si);
    const dd = days[k];
    if (dd && dd.hardDay && !(dd.checks && habits.length > 0 && habits.every(h => dd.checks[h.id]))) {
      hardInStreak++;
    }
    count++;
  }

  // XP + Level + Badges — PERSISTED on data (never lost once earned).
  // Effect below banks any newly clean days + newly earned badges into
  // data.lifetimeXP and data.unlockedBadges.
  const lifetimeXP = data.lifetimeXP || 0;
  const claimedLevel = data.claimedLevel || 1;
  // Display-level honors claimedLevel — Boss has to TAP to advance.
  // Bar parks at 100% with "TAP TO CLAIM" until he claims.
  const levelInfo = getDisplayLevel(lifetimeXP, claimedLevel);
  const unlockedBadges = data.unlockedBadges || [];
  const badgeInfo = {
    unlocked: new Set(unlockedBadges),
    totalUnlocked: unlockedBadges.length,
    totalAvailable: BADGES.length,
  };
  const justUnlocked = data._justUnlocked || [];

  // Level-claim cinematic — fired when Boss taps the bar.
  const [levelClaimState, setLevelClaimState] = useState({ id: 0, level: null });
  function claimNextLevel() {
    if (!levelInfo.available) return;
    const newClaimed = claimedLevel + 1;
    const nextLevel = LEVELS.find(l => l.id === newClaimed);
    saveFields({ claimedLevel: newClaimed });
    setLevelClaimState(s => ({ id: s.id + 1, level: nextLevel || null }));
  }
  // Run the gamification update pass when days/habits/data change.
  // Also migrates habits without createdAt on first run.
  useEffect(() => {
    if (loading || loadError) return;
    const next = applyGamificationUpdates(data, habits, today);
    if (next) {
      const patch = {};
      for (const key of ["habits", "unlockedBadges", "creditedDays", "lifetimeXP", "_justUnlocked"]) {
        if (next[key] !== data[key]) patch[key] = next[key];
      }
      saveFields(patch);
    }
  }, [days, habits, loading, loadError]);

  // Auto-rollover unchecked tasks from previous unprocessed days → today.
  // Tracked via data._lastRolloverDay plus per-task rolledOver guards.
  const [rolloverInfo, setRolloverInfo] = useState(null);
  useEffect(() => {
    if (loading || loadError) return;
    let info = null;
    saveComputed(current => {
      const result = applyRollover(current);
      if (!result) {
        if (current._lastRolloverDay === today) return null;
        return {
          nextData: Object.assign({}, current, { _lastRolloverDay: today }),
          patch: { _lastRolloverDay: today },
        };
      }
      info = { rolled: result.rolled, dropped: result.dropped };
      const prevDays = current.days || {};
      const nextDays = result.nextData.days || {};
      const dayUpdates = {};
      for (const k of Object.keys(nextDays)) {
        if (prevDays[k] !== nextDays[k]) dayUpdates[k] = nextDays[k];
      }
      const patch = { _lastRolloverDay: today };
      if (patchFieldCount(dayUpdates)) patch.days = dayUpdates;
      return {
        nextData: Object.assign({}, result.nextData, { _lastRolloverDay: today }),
        patch,
      };
    });
    if (info && (info.rolled > 0 || info.dropped.length > 0)) {
      setRolloverInfo(info);
      const t = setTimeout(() => setRolloverInfo(null), 7000);
      return () => clearTimeout(t);
    }
  }, [loading, loadError, today]);
  // Clear the _justUnlocked flag once the toast has had a chance to render.
  useEffect(() => {
    if (loadError || justUnlocked.length === 0) return;
    const t = setTimeout(() => {
      saveFields({ _justUnlocked: [] });
    }, 5000);
    return () => clearTimeout(t);
  }, [justUnlocked.length, loadError]);

  if (loading) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--t3)", fontSize: 13, letterSpacing: "0.2em", fontFamily: "'Cinzel', serif" }}>
          loading…
        </div>
      </div>
    );
  }
  if (loadError) {
    return <DataLoadError message={loadError} onRetry={() => window.location.reload()} onLogout={onLogout} />;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      <div className="top-strip" />

      <div className="app">
        {/* Header */}
        <div className="top-header">
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div className="brand-katakana">{(data.theme || "command").startsWith("seal") ? "Seal" : "ロディオン"}</div>
            <div className="brand-sub">Command · Center</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="date-main">
              {niceDate(today).toUpperCase()}
            </div>
            <div className="date-sub">
              W{getWeekNum(today)} · Q{getQuarter(today)} · {today.split("-")[0]}
            </div>
            <div className={`save-state save-state-${syncError ? "error" : saveStatus}`}>
              {syncError ? "SAVE FAILED" : saveStatus === "saving" ? "SAVING..." : saveStatus === "saved" ? "SAVED" : "SYNC READY"}
            </div>
          </div>
        </div>

        {syncError && (
          <div className="sync-alert">
            {syncError}
          </div>
        )}

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
            streak={streak} bestStreak={bestStreak} hardInStreak={hardInStreak}
            recurring={recurring} tags={tags}
            monadImage={monadImage}
            openHabitModal={h => setHabitModal(h)}
            levelInfo={levelInfo} badgeInfo={badgeInfo}
            claimNextLevel={claimNextLevel}
            celebratedThresholds={data.celebratedThresholds || []}
            markThresholdCelebrated={n => saveFields(prev => {
              const current = prev.celebratedThresholds || [];
              if (current.includes(n)) return null;
              return { celebratedThresholds: current.concat([n]) };
            })}
            bannerPhrases={data.bannerPhrases || []}
          />
        )}
        {tab === "week" && (
          <WeekTab
            days={days} habits={habits} today={today}
            dayOff={dayOff} setDayOff={setDayOff}
            setTab={setTab} tags={tags}
          />
        )}
        {tab === "month" && (
          <MonthTab
            days={days} habits={habits} today={today}
            mOff={mOff} setMOff={setMOff}
            setDayOff={setDayOff} setTab={setTab}
            monadImage={monadImage}
          />
        )}
        {tab === "stats" && (
          <StatsTab
            days={days} habits={habits} today={today}
            levelInfo={levelInfo} badgeInfo={badgeInfo}
            streak={streak}
            claimNextLevel={claimNextLevel}
            monadImage={monadImage}
          />
        )}
        {tab === "log" && <LogTab logs={logs} setLogs={setLogs} today={today} monadImage={monadImage} />}
        {tab === "goals" && <GoalsTab goals={goals} setGoals={setGoals} monadImage={monadImage} />}
        {tab === "settings" && (
          <SettingsTab
            habits={habits} setHabits={setHabits}
            recurring={recurring} setRecurring={setRecurring}
            tags={tags} renameTag={renameTag} deleteTag={deleteTag}
            setTags={setTags} countTagUsage={countTagUsage}
            data={data} setDay={setDay} getDayData={getDayData}
            today={today} bulkSetDays={bulkSetDays}
            badgeInfo={badgeInfo} levelInfo={levelInfo}
            claimNextLevel={claimNextLevel}
            bannerPhrases={data.bannerPhrases || []}
            setBannerPhrases={p => saveFields({ bannerPhrases: p })}
            hardModeOn={!!data.hardModeOn}
            setHardModeOn={v => saveFields({ hardModeOn: v })}
            strictStreak={!!data.strictStreak}
            setStrictStreak={v => saveFields({ strictStreak: v })}
            tabVisibility={tabVisibility}
            setTabVisibility={v => saveFields({ tabVisibility: v })}
            theme={data.theme || "command"}
            setTheme={v => saveFields({ theme: v })}
            monadImage={monadImage}
            setMonadImage={v => saveFields({ monadImage: v })}
            accountEmail={accountEmail}
            accountUid={accountMode === "google" ? uid : ""}
            accountMode={accountMode}
            dataSource={dataSource}
            syncError={syncError}
            onLogout={onLogout}
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

      {/* Floating quick actions — settings is always one tap away. */}
      <FloatingAdd
        showAdd={true}
        onAddFallback={() => {
          setTab("day");
          setDayOff(0);
        }}
        onSettings={() => {
          setTab("settings");
          setDayOff(0);
        }}
      />

      {/* Level claim cinematic — fires on tap-to-claim */}
      <LevelClaim fireId={levelClaimState.id} level={levelClaimState.level} />
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
