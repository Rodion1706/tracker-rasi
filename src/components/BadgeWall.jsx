// Grid of all badges. Unlocked glow red, locked are dimmed.
// Lives on SettingsTab.

import { BADGES } from "../gamification";

const CATEGORY_LABELS = {
  intro: "GETTING STARTED",
  streak: "STREAK MILESTONES",
  total: "TOTAL CLEAN DAYS",
  task: "TASKS SHIPPED",
  special: "SPECIAL",
};

export default function BadgeWall({ badgeInfo }) {
  const unlocked = badgeInfo ? badgeInfo.unlocked : new Set();
  const unlockedCount = unlocked.size;

  // Group by category
  const byCategory = {};
  for (const b of BADGES) {
    const cat = b.category || "special";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(b);
  }
  const order = ["intro", "streak", "total", "task", "special"];

  return (
    <div className="badge-wall">
      <div className="badge-wall-head">
        <span className="badge-wall-label">ACHIEVEMENTS</span>
        <span className="badge-wall-count">{unlockedCount} / {BADGES.length}</span>
      </div>
      {order.map(cat => {
        const items = byCategory[cat];
        if (!items) return null;
        return (
          <div key={cat} className="badge-category">
            <div className="badge-category-label">{CATEGORY_LABELS[cat] || cat}</div>
            <div className="badge-grid">
              {items.map(b => {
                const isOn = unlocked.has(b.id);
                return (
                  <div key={b.id} className={`badge ${isOn ? "on" : ""}`} title={b.desc}>
                    <div className="badge-seal">
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
                        {isOn && (
                          <circle cx="20" cy="20" r="4" fill="currentColor" />
                        )}
                      </svg>
                    </div>
                    <div className="badge-name">{b.name}</div>
                    <div className="badge-desc">{b.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
