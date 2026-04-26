// Service worker — Command Center.
// Two jobs:
// 1. Show notifications scheduled by the app via postMessage.
// 2. Re-fire the daily reminder schedule when activated/reawakened.
//
// We use scheduled timeouts via setTimeout. SW lifetime is short
// (browsers terminate idle workers in seconds-to-minutes), so the page
// re-posts the schedule each time it loads. iOS PWA wakes the SW on
// app open which retriggers scheduling.

const CACHE = "cmd-v1";

self.addEventListener("install", e => {
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(self.clients.claim());
});

let timers = [];

function clearTimers() {
  for (const id of timers) clearTimeout(id);
  timers = [];
}

function scheduleAt(when, payload) {
  const delay = when - Date.now();
  if (delay <= 0) return;
  const id = setTimeout(() => {
    self.registration.showNotification(payload.title || "Command Center", {
      body: payload.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: payload.tag || "cmd-reminder",
      renotify: true,
    }).catch(() => {});
  }, delay);
  timers.push(id);
}

self.addEventListener("message", e => {
  const data = e.data || {};
  if (data.type === "SCHEDULE_REMINDERS") {
    clearTimers();
    for (const r of (data.reminders || [])) {
      scheduleAt(r.when, r);
    }
  } else if (data.type === "CLEAR_REMINDERS") {
    clearTimers();
  }
});

// Click on notification → focus app
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then(clientList => {
      for (const c of clientList) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/");
    })
  );
});
