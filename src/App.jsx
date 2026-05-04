import { useState, useEffect, useRef } from "react";
import { db, auth, provider, doc, collection, getDoc, getDocs, setDoc, writeBatch, serverTimestamp, FieldPath, signInWithPopup, signOut, onAuthStateChanged } from "./firebase";
import { DEF_HABITS, DEF_GOALS, DEF_TAGS, argDate, niceDate } from "./config";
import { isDayClean, getLevel, getDisplayLevel, applyGamificationUpdates, BADGES } from "./gamification";
import { applyRollover } from "./rollover";
import { scheduleReminders } from "./notifications";

/* ══════ ACCESS CONTROL ══════ */
// Only these emails can sign in. Add more if needed.
const ALLOWED_EMAILS = ["radzivonlavyshwork@gmail.com", "dmytro.merzliakov@gmail.com", "j.lavysh@gmail.com"];
const LOCAL_PREVIEW_UID = "__local_preview__";
const LOCAL_PREVIEW_STORAGE_KEY = "command-center-local-preview";
const EMERGENCY_SNAPSHOT_PREFIX = "command-center-emergency-snapshots-v1:";
const EMERGENCY_SNAPSHOT_LIMIT = 14;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SPLIT_DAYS_SCHEMA_VERSION = 3;
const BATCH_WRITE_LIMIT = 430;

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
  return Object.keys((data && data.days) || {}).filter(k => DAY_KEY_RE.test(k)).length;
}

function taskCount(data) {
  let n = 0;
  const days = (data && data.days) || {};
  for (const key of Object.keys(days)) {
    const d = days[key];
    if (d && Array.isArray(d.tasks)) n += d.tasks.length;
  }
  return n;
}

function snapshotKey(uid) {
  return EMERGENCY_SNAPSHOT_PREFIX + uid;
}

function cleanForLocalSnapshot(data) {
  return JSON.parse(JSON.stringify(data || emptyData()));
}

function summarizeSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    id: snapshot.id,
    savedAt: snapshot.savedAt,
    reason: snapshot.reason,
    dayCount: snapshot.dayCount || 0,
    taskCount: snapshot.taskCount || 0,
  };
}

function readEmergencySnapshots(uid) {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(snapshotKey(uid));
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter(s => s && s.data) : [];
  } catch (e) {
    return [];
  }
}

function latestEmergencySnapshot(uid) {
  return readEmergencySnapshots(uid)[0] || null;
}

function writeEmergencySnapshot(uid, data, reason) {
  if (!uid) return null;
  const days = dayCount(data);
  const tasks = taskCount(data);
  if (days === 0 && tasks === 0) return null;
  try {
    const snapshot = {
      id: makeWriteId(),
      savedAt: new Date().toISOString(),
      reason,
      dayCount: days,
      taskCount: tasks,
      data: cleanForLocalSnapshot(data),
    };
    const existing = readEmergencySnapshots(uid);
    const next = [snapshot].concat(existing).slice(0, EMERGENCY_SNAPSHOT_LIMIT);
    localStorage.setItem(snapshotKey(uid), JSON.stringify(next));
    return snapshot;
  } catch (e) {
    return null;
  }
}

function makeWriteId() {
  return Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

function patchFieldCount(patch) {
  return Object.keys(patch || {}).length;
}

function splitPatch(patch) {
  const rootPatch = {};
  const dayUpdates = {};
  for (const key of Object.keys(patch || {})) {
    if (key === "days" && patch.days && typeof patch.days === "object" && !Array.isArray(patch.days)) {
      for (const dayKey of Object.keys(patch.days)) {
        if (DAY_KEY_RE.test(dayKey)) dayUpdates[dayKey] = patch.days[dayKey];
      }
    } else {
      rootPatch[key] = patch[key];
    }
  }
  return { rootPatch, dayUpdates };
}

function legacyMergeFieldsForPatch(patch) {
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

function changedKeys(obj) {
  return Object.keys(obj || {}).sort();
}

function dayRange(data) {
  const keys = changedKeys((data && data.days) || {}).filter(k => DAY_KEY_RE.test(k));
  return { firstDay: keys[0] || "none", lastDay: keys[keys.length - 1] || "none" };
}

function dataHealth(data, source, storageMode) {
  const range = dayRange(data);
  return {
    schemaVersion: SPLIT_DAYS_SCHEMA_VERSION,
    storageMode: storageMode || "split-days-v1",
    source: source || "client",
    dayCount: dayCount(data),
    taskCount: taskCount(data),
    firstDay: range.firstDay,
    lastDay: range.lastDay,
    clientCheckedAt: new Date().toISOString(),
  };
}

function cleanDayDoc(day) {
  const next = Object.assign({}, day || {});
  delete next._updatedAt;
  delete next._lastWriteId;
  return next;
}

function cleanDayForRemote(day) {
  return JSON.parse(JSON.stringify(cleanDayDoc(day || { checks: {}, tasks: [] })));
}

function cleanRootPatch(rootPatch) {
  const next = Object.assign({}, rootPatch || {});
  delete next.days;
  return next;
}

function rootDataWithoutDays(data) {
  const root = {};
  for (const key of Object.keys(data || {})) {
    if (key !== "days") root[key] = data[key];
  }
  return root;
}

function summarizeDayChange(prevDay, nextDay) {
  const prevChecks = (prevDay && prevDay.checks) || {};
  const nextChecks = (nextDay && nextDay.checks) || {};
  const checkIds = new Set(changedKeys(prevChecks).concat(changedKeys(nextChecks)));
  let checkFlips = 0;
  checkIds.forEach(id => {
    if (!!prevChecks[id] !== !!nextChecks[id]) checkFlips++;
  });

  const prevTasks = new Map(((prevDay && prevDay.tasks) || []).filter(Boolean).map(t => [String(t.id), t]));
  const nextTasks = new Map(((nextDay && nextDay.tasks) || []).filter(Boolean).map(t => [String(t.id), t]));
  let taskAdds = 0, taskDeletes = 0, taskDoneFlips = 0, taskEdits = 0, rolloverMarks = 0;
  nextTasks.forEach((t, id) => {
    const old = prevTasks.get(id);
    if (!old) {
      taskAdds++;
      return;
    }
    if (!!old.done !== !!t.done) taskDoneFlips++;
    if ((old.text || "") !== (t.text || "") || (old.tag || "") !== (t.tag || "")) taskEdits++;
    if (!!old.rolledOver !== !!t.rolledOver) rolloverMarks++;
  });
  prevTasks.forEach((_, id) => {
    if (!nextTasks.has(id)) taskDeletes++;
  });

  return {
    checkFlips,
    taskAdds,
    taskDeletes,
    taskDoneFlips,
    taskEdits,
    rolloverMarks,
    hardDayChanged: !!(prevDay && prevDay.hardDay) !== !!(nextDay && nextDay.hardDay),
  };
}

function inferWriteReason(patch, fallback) {
  if (fallback) return fallback;
  const keys = changedKeys(patch);
  if (patch && patch.days) return keys.length > 1 ? "mixed-day-write" : "day-write";
  if (keys.includes("goals")) return "goals-write";
  if (keys.includes("logs")) return "logs-write";
  if (keys.includes("habits")) return "habits-write";
  if (keys.includes("recurring")) return "recurring-write";
  if (keys.includes("tags")) return "tags-write";
  if (keys.includes("theme") || keys.includes("monadImage") || keys.includes("tabVisibility")) return "settings-write";
  return "profile-write";
}

function buildAuditEntry(uid, prev, next, patch, reason, writeId) {
  const split = splitPatch(patch);
  const dayKeys = changedKeys(split.dayUpdates);
  const daySummaries = {};
  dayKeys.slice(0, 60).forEach(k => {
    daySummaries[k] = summarizeDayChange((prev.days || {})[k], split.dayUpdates[k]);
  });
  return {
    id: writeId,
    userId: uid,
    schemaVersion: SPLIT_DAYS_SCHEMA_VERSION,
    storageMode: "split-days-v1",
    reason: inferWriteReason(patch, reason),
    rootFields: changedKeys(split.rootPatch),
    dayKeys: dayKeys.slice(0, 80),
    dayKeyCount: dayKeys.length,
    before: Object.assign({ taskCount: taskCount(prev) }, dayRange(prev), { dayCount: dayCount(prev) }),
    after: Object.assign({ taskCount: taskCount(next) }, dayRange(next), { dayCount: dayCount(next) }),
    daySummaries,
    clientAt: new Date().toISOString(),
    createdAt: serverTimestamp(),
  };
}

async function commitBatched(ops) {
  let batch = writeBatch(db);
  let count = 0;
  async function flush() {
    if (count === 0) return;
    const current = batch;
    batch = writeBatch(db);
    count = 0;
    await current.commit();
  }
  for (const op of ops) {
    if (count >= BATCH_WRITE_LIMIT) await flush();
    if (op.type === "set") batch.set(op.ref, op.data, op.options || {});
    if (op.type === "delete") batch.delete(op.ref);
    count++;
  }
  await flush();
}

async function readSplitDays(uid) {
  const snap = await getDocs(collection(db, "users", uid, "days"));
  const days = {};
  snap.forEach(dayDoc => {
    if (DAY_KEY_RE.test(dayDoc.id)) days[dayDoc.id] = cleanDayDoc(dayDoc.data());
  });
  return days;
}

function addRemoteMetadata(data, source, storageMode) {
  const mode = storageMode || "split-days-v1";
  const health = dataHealth(data, source, mode);
  return Object.assign({}, data, {
    schemaVersion: Math.max(data.schemaVersion || 0, SPLIT_DAYS_SCHEMA_VERSION),
    storageMode: mode,
    _health: health,
  });
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
  const [recoverySnapshot, setRecoverySnapshot] = useState(null);
  const [localBackupInfo, setLocalBackupInfo] = useState(null);
  const dataRef = useRef(d);
  const readyRef = useRef(false);
  const errorRef = useRef(null);
  const writeSeqRef = useRef(0);
  const writeChainRef = useRef(Promise.resolve());
  const writeFailureRef = useRef(false);
  const splitDaysAvailableRef = useRef(true);
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
    splitDaysAvailableRef.current = true;
    setLd(true);
    setLoadError(null);
    setSyncError(null);
    setSaveStatus("idle");
    setRecoverySnapshot(null);
    setLocalBackupInfo(summarizeSnapshot(latestEmergencySnapshot(uid)));
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
        const snap = writeEmergencySnapshot(uid, next, "local-preview-read");
        if (snap) setLocalBackupInfo(summarizeSnapshot(snap));
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
        const rootData = s.exists() ? s.data() : {};
        let splitDays = {};
        try {
          splitDays = await readSplitDays(uid);
        } catch (splitError) {
          splitDaysAvailableRef.current = false;
        }
        if (cancelled) return;
        const next = normalizeData(Object.assign({}, rootData, {
          days: Object.assign({}, (rootData && rootData.days) || {}, splitDays),
          storageMode: splitDaysAvailableRef.current ? "split-days-v1" : (rootData.storageMode || "legacy-document-fallback"),
        }));
        const localSnap = latestEmergencySnapshot(uid);
        if (dayCount(next) === 0 && localSnap && (localSnap.dayCount || 0) > 0) {
          setD(normalizeData(localSnap.data));
          dataRef.current = normalizeData(localSnap.data);
          setRecoverySnapshot(summarizeSnapshot(localSnap));
          setLocalBackupInfo(summarizeSnapshot(localSnap));
          setDataSource("recovery-available");
          return;
        }
        setD(next);
        dataRef.current = next;
        readyRef.current = true;
        setDataSource(s.exists() ? "remote-existing" : "remote-new");
        const snap = writeEmergencySnapshot(uid, next, "cloud-read");
        if (snap) setLocalBackupInfo(summarizeSnapshot(snap));
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

  function sendLegacyPatch(userRef, remotePatch, mergeFields, attempt) {
    return setDoc(userRef, remotePatch, { mergeFields }).catch(e => {
      if (attempt < 2) {
        return new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)))
          .then(() => sendLegacyPatch(userRef, remotePatch, mergeFields, attempt + 1));
      }
      throw e;
    });
  }

  function sendSplitPatch(uidValue, prevData, nextData, patch, reason, writeId, attempt) {
    const userRef = doc(db, "users", uidValue);
    const { rootPatch, dayUpdates } = splitPatch(patch);
    const health = dataHealth(nextData, reason || "write");
    const remoteRootPatch = Object.assign({}, cleanRootPatch(rootPatch), {
      schemaVersion: SPLIT_DAYS_SCHEMA_VERSION,
      storageMode: "split-days-v1",
      updatedAt: serverTimestamp(),
      lastWriteId: writeId,
      _health: Object.assign({}, health, { updatedAt: serverTimestamp() }),
    });
    const auditEntry = buildAuditEntry(uidValue, prevData, nextData, patch, reason, writeId);
    const ops = [
      { type: "set", ref: userRef, data: remoteRootPatch, options: { merge: true } },
    ];
    for (const dayKey of changedKeys(dayUpdates)) {
      ops.push({
        type: "set",
        ref: doc(db, "users", uidValue, "days", dayKey),
        data: Object.assign({}, cleanDayForRemote(dayUpdates[dayKey]), {
          _updatedAt: serverTimestamp(),
          _lastWriteId: writeId,
        }),
        options: { merge: true },
      });
    }
    ops.push({
      type: "set",
      ref: doc(db, "users", uidValue, "events", writeId),
      data: auditEntry,
      options: { merge: false },
    });

    return commitBatched(ops).catch(e => {
      if (attempt < 2) {
        return new Promise(resolve => setTimeout(resolve, 700 * (attempt + 1)))
          .then(() => sendSplitPatch(uidValue, prevData, nextData, patch, reason, writeId, attempt + 1));
      }
      throw e;
    });
  }

  async function writeFullRestore(uidValue, prevData, nextData, reason, writeId) {
    const existing = await getDocs(collection(db, "users", uidValue, "days"));
    const keep = new Set(changedKeys((nextData && nextData.days) || {}).filter(k => DAY_KEY_RE.test(k)));
    const userRef = doc(db, "users", uidValue);
    const rootData = Object.assign({}, rootDataWithoutDays(nextData), {
      days: {},
      schemaVersion: SPLIT_DAYS_SCHEMA_VERSION,
      storageMode: "split-days-v1",
      updatedAt: serverTimestamp(),
      restoredAt: serverTimestamp(),
      lastWriteId: writeId,
      _health: Object.assign({}, dataHealth(nextData, reason || "restore"), { updatedAt: serverTimestamp() }),
    });
    const ops = [
      { type: "set", ref: userRef, data: rootData, options: { merge: true } },
    ];
    for (const dayKey of keep) {
      ops.push({
        type: "set",
        ref: doc(db, "users", uidValue, "days", dayKey),
        data: Object.assign({}, cleanDayForRemote(nextData.days[dayKey]), {
          _updatedAt: serverTimestamp(),
          _lastWriteId: writeId,
        }),
        options: { merge: false },
      });
    }
    existing.forEach(dayDoc => {
      if (DAY_KEY_RE.test(dayDoc.id) && !keep.has(dayDoc.id)) {
        ops.push({ type: "delete", ref: doc(db, "users", uidValue, "days", dayDoc.id) });
      }
    });
    ops.push({
      type: "set",
      ref: doc(db, "users", uidValue, "events", writeId),
      data: buildAuditEntry(uidValue, prevData, nextData, { days: nextData.days || {}, restoredAt: true }, reason || "restore", writeId),
      options: { merge: false },
    });
    await commitBatched(ops);
  }

  function restoreData(rawData, reason) {
    if (!uid) return Promise.reject(new Error("No active account."));
    const restoreStorageMode = splitDaysAvailableRef.current ? "split-days-v1" : "legacy-document-fallback";
    const nd = addRemoteMetadata(normalizeData(rawData), reason || "restore", restoreStorageMode);
    const prev = dataRef.current;
    const prevDays = dayCount(dataRef.current);
    const nextDays = dayCount(nd);
    if (prevDays > 0 && nextDays === 0) {
      const message = "Blocked restore because the selected backup has no tracked days.";
      setSyncError(message);
      setSaveStatus("error");
      return Promise.reject(new Error(message));
    }
    dataRef.current = nd;
    setD(nd);
    readyRef.current = true;
    errorRef.current = null;
    setRecoverySnapshot(null);
    setDataSource(uid === LOCAL_PREVIEW_UID ? "local-preview" : "remote-existing");
    setSyncError(null);
    const writeNumber = writeSeqRef.current + 1;
    writeSeqRef.current = writeNumber;
    const snap = writeEmergencySnapshot(uid, nd, reason || "manual-restore");
    if (snap) setLocalBackupInfo(summarizeSnapshot(snap));
    if (uid === LOCAL_PREVIEW_UID) {
      try { localStorage.setItem(LOCAL_PREVIEW_STORAGE_KEY, JSON.stringify(nd)); } catch (e) { /* no-op */ }
      markSaved(writeNumber);
      return Promise.resolve(nd);
    }
    setSaveStatus("saving");
    const writeId = makeWriteId();
    const writeTask = writeChainRef.current
      .catch(() => {})
      .then(() => {
        const legacyRestore = () => {
          const remoteData = Object.assign({}, nd, {
            schemaVersion: 2,
            updatedAt: serverTimestamp(),
            restoredAt: serverTimestamp(),
            lastWriteId: writeId,
          });
          return setDoc(doc(db, "users", uid), remoteData, { merge: true });
        };
        if (splitDaysAvailableRef.current) {
          return writeFullRestore(uid, prev, nd, reason || "restore", writeId).catch(e => {
            if (e && e.code === "permission-denied") {
              splitDaysAvailableRef.current = false;
              return legacyRestore();
            }
            throw e;
          });
        }
        return legacyRestore();
      });
    writeChainRef.current = writeTask.catch(() => {});
    return writeTask.then(() => {
      setSyncError(null);
      markSaved(writeNumber);
      return nd;
    }).catch(e => {
      markFailed(writeNumber, e);
      throw e;
    });
  }

  function saveComputed(compute, reason) {
    if (!uid || !readyRef.current || errorRef.current) return;
    const prev = dataRef.current;
    const result = compute(prev);
    if (!result || !result.nextData || result.nextData === prev || !patchFieldCount(result.patch)) return;
    const writeReason = inferWriteReason(result.patch, reason || result.reason);
    const storageMode = splitDaysAvailableRef.current ? "split-days-v1" : "legacy-document-fallback";
    const nd = addRemoteMetadata(result.nextData, writeReason, storageMode);
    const prevDays = dayCount(prev);
    const nextDays = dayCount(nd);
    if (prevDays > 0 && nextDays === 0) {
      setSyncError("Blocked a write that would clear all tracked days.");
      setSaveStatus("error");
      return;
    }
    dataRef.current = nd;
    setD(nd);
    const snap = writeEmergencySnapshot(uid, nd, "local-write");
    if (snap) setLocalBackupInfo(summarizeSnapshot(snap));
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
    const writeId = makeWriteId();
    const rootMetaPatch = {
      schemaVersion: SPLIT_DAYS_SCHEMA_VERSION,
      storageMode: splitDaysAvailableRef.current ? "split-days-v1" : "legacy-document-fallback",
      _health: dataHealth(nd, writeReason, storageMode),
    };
    const remotePatch = Object.assign({}, result.patch, rootMetaPatch, {
      updatedAt: serverTimestamp(),
      lastWriteId: writeId,
    });
    const userRef = doc(db, "users", uid);
    const mergeFields = legacyMergeFieldsForPatch(remotePatch);
    const writeTask = writeChainRef.current
      .catch(() => {})
      .then(() => {
        if (splitDaysAvailableRef.current) {
          return sendSplitPatch(uid, prev, nd, result.patch, writeReason, writeId, 0).catch(e => {
            if (e && e.code === "permission-denied") {
              splitDaysAvailableRef.current = false;
              return sendLegacyPatch(userRef, remotePatch, mergeFields, 0);
            }
            throw e;
          });
        }
        return sendLegacyPatch(userRef, remotePatch, mergeFields, 0);
      });
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

  function saveFields(patchOrFn, reason) {
    saveComputed(prev => {
      const patch = typeof patchOrFn === "function" ? patchOrFn(prev) : patchOrFn;
      if (!patchFieldCount(patch)) return null;
      return { nextData: Object.assign({}, prev, patch), patch };
    }, reason);
  }

  function saveDay(key, val, reason) {
    saveComputed(prev => {
      const prevDays = prev.days || {};
      const prevDay = prevDays[key] || { checks: {}, tasks: [] };
      const nextDay = typeof val === "function" ? val(prevDay) : val;
      if (nextDay === prevDay) return null;
      return {
        nextData: Object.assign({}, prev, { days: Object.assign({}, prevDays, { [key]: nextDay }) }),
        patch: { days: { [key]: nextDay } },
      };
    }, reason || "day-write");
  }

  function saveDays(updates, reason) {
    if (!patchFieldCount(updates)) return;
    saveComputed(prev => {
      const prevDays = prev.days || {};
      return {
        nextData: Object.assign({}, prev, { days: Object.assign({}, prevDays, updates) }),
        patch: { days: updates },
      };
    }, reason || "days-bulk-write");
  }

  return {
    data: d,
    loading: ld,
    loadError,
    syncError,
    saveStatus,
    dataSource,
    recoverySnapshot,
    localBackupInfo,
    saveFields,
    saveDay,
    saveDays,
    saveComputed,
    restoreData,
  };
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

function DataRecovery({ snapshot, onRestore, onRetry, onLogout }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function restore() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onRestore();
    } catch (e) {
      setError(e && e.message ? e.message : "Could not restore local emergency backup.");
      setBusy(false);
    }
  }
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ maxWidth: 520 }}>
        <div style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 34,
          fontWeight: 700,
          letterSpacing: "0.2em",
          color: "var(--red)",
          marginBottom: 16,
        }}>RECOVERY AVAILABLE</div>
        <div style={{
          color: "var(--t2)",
          fontSize: 12,
          lineHeight: 1.7,
          letterSpacing: "0.08em",
          fontFamily: "'JetBrains Mono', monospace",
          marginBottom: 18,
        }}>
          Cloud profile looks empty, but this browser has a local emergency snapshot:
          <br />
          {(snapshot && snapshot.dayCount) || 0} days · {(snapshot && snapshot.taskCount) || 0} tasks
          {snapshot && snapshot.savedAt ? " · " + new Date(snapshot.savedAt).toLocaleString() : ""}
          <br />
          Writes are blocked until you restore or retry, so the empty cloud state cannot overwrite history.
        </div>
        {error && (
          <div className="sync-alert" style={{ textAlign: "left" }}>{error}</div>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <div onClick={restore} className="add-btn">{busy ? "RESTORING..." : "RESTORE LOCAL BACKUP"}</div>
          <div onClick={onRetry} className="add-btn" style={{ background: "rgba(var(--accent-rgb), 0.06)" }}>RETRY CLOUD</div>
          <div onClick={onLogout} className="add-btn" style={{ background: "rgba(var(--accent-rgb), 0.06)" }}>SIGN OUT</div>
        </div>
      </div>
    </div>
  );
}

/* ══════ TRACKER ══════ */
function Tracker({ uid, accountEmail, accountMode, onLogout }) {
  const { data, loading, loadError, syncError, saveStatus, dataSource, recoverySnapshot, localBackupInfo, saveFields, saveDay, saveDays, saveComputed, restoreData } = useData(uid);
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

  function setHabits(h) { saveFields({ habits: h }, "habits-write"); }
  function setGoals(g) { saveFields({ goals: g }, "goals-write"); }
  function setRecurring(r) { saveFields({ recurring: r }, "recurring-write"); }
  function setLogs(l) { saveFields({ logs: l }, "logs-write"); }
  function setTags(t) { saveFields({ tags: t }, "tags-write"); }

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
    }, "tag-rename");
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
    }, "tag-delete");
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
    saveDay(key, val, "day-write");
  }
  function bulkSetDays(updates) {
    saveDays(updates, "days-bulk-write");
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
    saveFields({ claimedLevel: newClaimed }, "level-claim");
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
      saveFields(patch, "gamification");
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
    }, "rollover");
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
      saveFields({ _justUnlocked: [] }, "badge-toast-clear");
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
  if (recoverySnapshot) {
    return (
      <DataRecovery
        snapshot={recoverySnapshot}
        onRestore={() => restoreData(data, "emergency-local-restore")}
        onRetry={() => window.location.reload()}
        onLogout={onLogout}
      />
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
            setBannerPhrases={p => saveFields({ bannerPhrases: p }, "banner-phrases-write")}
            hardModeOn={!!data.hardModeOn}
            setHardModeOn={v => saveFields({ hardModeOn: v }, "hard-mode-write")}
            strictStreak={!!data.strictStreak}
            setStrictStreak={v => saveFields({ strictStreak: v }, "strict-streak-write")}
            tabVisibility={tabVisibility}
            setTabVisibility={v => saveFields({ tabVisibility: v }, "tab-visibility-write")}
            theme={data.theme || "command"}
            setTheme={v => saveFields({ theme: v }, "theme-write")}
            monadImage={monadImage}
            setMonadImage={v => saveFields({ monadImage: v }, "monad-image-write")}
            accountEmail={accountEmail}
            accountUid={accountMode === "google" ? uid : ""}
            accountMode={accountMode}
            dataSource={dataSource}
            syncError={syncError}
            localBackupInfo={localBackupInfo}
            restoreBackup={raw => restoreData(raw, "json-backup-restore")}
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
