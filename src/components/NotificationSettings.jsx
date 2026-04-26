// Notification settings — daily morning + evening reminders.
// Honest about reliability: works best when installed as PWA.

import { useState, useEffect } from "react";
import {
  getNotifyCfg,
  setNotifyCfg,
  notificationsSupported,
  notificationPermission,
  requestNotificationPermission,
  scheduleReminders,
  clearScheduledReminders,
  fireTestNotification,
} from "../notifications";

export default function NotificationSettings() {
  const supported = notificationsSupported();
  const [cfg, setCfg] = useState(getNotifyCfg());
  const [perm, setPerm] = useState(supported ? notificationPermission() : "unsupported");

  // Re-push schedule whenever cfg changes & permission is granted.
  useEffect(() => {
    setNotifyCfg(cfg);
    if (cfg.enabled && perm === "granted") scheduleReminders();
    else clearScheduledReminders();
  }, [cfg, perm]);

  function update(patch) { setCfg(Object.assign({}, cfg, patch)); }

  async function handleEnable() {
    if (perm === "granted") {
      update({ enabled: !cfg.enabled });
      return;
    }
    const next = await requestNotificationPermission();
    setPerm(next);
    if (next === "granted") update({ enabled: true });
  }

  async function handleTest() {
    if (perm !== "granted") {
      const next = await requestNotificationPermission();
      setPerm(next);
      if (next !== "granted") return;
    }
    fireTestNotification();
  }

  if (!supported) {
    return (
      <div className="sound-toggle" style={{ opacity: 0.6 }}>
        <div className="sound-toggle-sw">
          <div className="sound-toggle-knob" />
        </div>
        <div>
          <div className="sound-toggle-label">REMINDERS</div>
          <div className="sound-toggle-sub">Not supported in this browser.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="notify-block">
      <div className="sound-toggle" onClick={handleEnable}>
        <div className={`sound-toggle-sw ${cfg.enabled && perm === "granted" ? "on" : ""}`}>
          <div className="sound-toggle-knob" />
        </div>
        <div>
          <div className="sound-toggle-label">REMINDERS</div>
          <div className="sound-toggle-sub">
            {perm === "denied"
              ? "Permission denied. Enable in browser settings."
              : perm !== "granted"
                ? "Off — tap to enable, browser will ask permission"
                : cfg.enabled
                  ? `Active — morning ${cfg.morning} · evening ${cfg.evening}`
                  : "Permission granted. Tap to start."}
          </div>
        </div>
      </div>

      {cfg.enabled && perm === "granted" && (
        <div className="notify-times">
          <div className="notify-time-row">
            <div className="notify-time-label">MORNING</div>
            <input
              type="time"
              className="notify-time-input"
              value={cfg.morning}
              onChange={e => update({ morning: e.target.value })}
            />
          </div>
          <div className="notify-time-row">
            <div className="notify-time-label">EVENING</div>
            <input
              type="time"
              className="notify-time-input"
              value={cfg.evening}
              onChange={e => update({ evening: e.target.value })}
            />
          </div>
          <div className="notify-test" onClick={handleTest}>FIRE TEST NOTIFICATION</div>
        </div>
      )}

      <div className="notify-disclaimer">
        <div className="notify-disclaimer-title">RELIABILITY</div>
        <div className="notify-disclaimer-body">
          Reliable when this app is added to your home screen
          <span className="notify-disclaimer-em"> (iOS Safari → Share → Add to Home Screen, then open from the icon).</span>
          {" "}Without install, notifications fire only while the page is open or recently closed. For 100%
          guaranteed scheduled push (Tier 1), backend setup is needed — flagged for a later session.
        </div>
      </div>
    </div>
  );
}
