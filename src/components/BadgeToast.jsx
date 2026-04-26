// Slide-in toast that fires when a new badge is unlocked.
// Multiple unlocks stack vertically. Auto-dismisses after ~4.5s.

import { BADGES } from "../gamification";

export default function BadgeToast({ badgeIds }) {
  if (!badgeIds || badgeIds.length === 0) return null;

  return (
    <div className="badge-toast-stack">
      {badgeIds.map((id, idx) => {
        const b = BADGES.find(bb => bb.id === id);
        if (!b) return null;
        return (
          <div
            key={id}
            className="badge-toast"
            style={{ animationDelay: `${idx * 0.15}s` }}
          >
            <div className="badge-toast-seal">
              <svg viewBox="0 0 40 40" fill="none">
                <polygon
                  points="12,2 28,2 38,12 38,28 28,38 12,38 2,28 2,12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
                <polygon
                  points="15,6 25,6 34,15 34,25 25,34 15,34 6,25 6,15"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  fill="none"
                  opacity="0.5"
                />
                <circle cx="20" cy="20" r="4" fill="currentColor" />
              </svg>
            </div>
            <div className="badge-toast-body">
              <div className="badge-toast-eyebrow">BADGE UNLOCKED</div>
              <div className="badge-toast-name">{b.name}</div>
              <div className="badge-toast-desc">{b.desc}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
