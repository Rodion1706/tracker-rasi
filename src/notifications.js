// Notification scheduler — set morning + evening daily reminders.
// Uses Notification API + Service Worker. Settings persist in
// localStorage so they survive reloads.
//
// LIMITATIONS (be honest with the user):
// - Reliable on installed PWA (Add to Home Screen). On iOS, requires
//   iOS 16.4+ and the page added to the home screen.
// - In-browser without install: notifications fire while the page is
//   open or recently closed (SW alive). After ~30 min idle on most
//   browsers, the SW is killed and notifications stop until the page
//   is opened again.
// - For 100% reliable scheduled push, server-side cron + Web Push API
//   is needed. That's a Phase 2 feature.

const STORE_KEY = "notifyCfg";

const DEFAULTS = {
  enabled: false,
  morning: "09:00",
  evening: "21:00",
  morningText: "Open Command Center — start the day clean",
  eveningText: "Close the day. Check what's left.",
};

export function getNotifyCfg() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return Object.assign({}, DEFAULTS);
    return Object.assign({}, DEFAULTS, JSON.parse(raw));
  } catch {
    return Object.assign({}, DEFAULTS);
  }
}

export function setNotifyCfg(cfg) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
  } catch {}
}

export function notificationsSupported() {
  return typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator;
}

export function notificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

// Compute the next Date for a "HH:MM" string (today if still ahead, else tomorrow).
function nextOccurrence(hhmm) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hh || 0, mm || 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target.getTime();
}

// Push the schedule to the service worker. Re-call every page load.
export async function scheduleReminders() {
  if (!notificationsSupported()) return false;
  const cfg = getNotifyCfg();
  if (!cfg.enabled) return false;
  if (Notification.permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) return false;

  const reminders = [];
  if (cfg.morning) {
    reminders.push({
      when: nextOccurrence(cfg.morning),
      title: "MORNING ROUTINE",
      body: cfg.morningText || DEFAULTS.morningText,
      tag: "cmd-morning",
    });
  }
  if (cfg.evening) {
    reminders.push({
      when: nextOccurrence(cfg.evening),
      title: "CLOSE THE DAY",
      body: cfg.eveningText || DEFAULTS.eveningText,
      tag: "cmd-evening",
    });
  }
  reg.active.postMessage({ type: "SCHEDULE_REMINDERS", reminders });
  return true;
}

export function clearScheduledReminders() {
  if (!notificationsSupported()) return;
  navigator.serviceWorker.ready.then(reg => {
    if (reg.active) reg.active.postMessage({ type: "CLEAR_REMINDERS" });
  }).catch(() => {});
}

// Fire a test notification right now (for the "preview" button).
export async function fireTestNotification() {
  if (Notification.permission !== "granted") return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification("Command Center", {
      body: "Notifications are working. ✓",
      icon: "/icon.svg",
      tag: "cmd-test",
    });
    return true;
  } catch {
    return false;
  }
}
