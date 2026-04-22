// Fires when the day closes (all habits + all tasks at 100%).
// Re-fires every time <100% → 100% transition happens.
//
// Tier scales with current streak AFTER the close:
//   tier 1 — normal day (48 particles, standard banner)
//   tier 2 — 7+ streak: "WEEK CLEAN", 80 particles, longer, brighter
//   tier 3 — 14+: "FORTNIGHT", 120 particles
//   tier 4 — 30+: "MONTH CLEAN", 180 particles, gold accents
//   tier 5 — 100+: "CENTURY", 240 particles, screen-shake
//
// Key on fireId forces remount every fire, so animations reset.

import { celebrationTier } from "../gamification";

const COLORS_BASE = ["#e8102a", "#ff4d6d", "#ff6fb2", "#ffffff"];
const COLORS_GOLD = ["#e8102a", "#ff4d6d", "#ffd700", "#ff6fb2", "#ffffff"];
const BANNER_LINES_TIER1 = [
  "DAY CLEAN",
  "LOCKED IN",
  "FULL CLEAR",
  "DISCIPLINE WINS",
  "CLOSED",
  "SHIPPED",
  "ALL GREEN",
];

function tierConfig(tier) {
  if (tier === 5) return {
    particleCount: 240, colors: COLORS_GOLD, banner: "CENTURY",
    sub: "100 DAYS CLEAN", durClass: "celeb-tier-5", spin: 1200,
  };
  if (tier === 4) return {
    particleCount: 180, colors: COLORS_GOLD, banner: "MONTH CLEAN",
    sub: "30 DAYS LOCKED", durClass: "celeb-tier-4", spin: 1000,
  };
  if (tier === 3) return {
    particleCount: 120, colors: COLORS_BASE, banner: "FORTNIGHT",
    sub: "14 DAYS STRAIGHT", durClass: "celeb-tier-3", spin: 900,
  };
  if (tier === 2) return {
    particleCount: 80, colors: COLORS_BASE, banner: "WEEK CLEAN",
    sub: "7 IN A ROW", durClass: "celeb-tier-2", spin: 800,
  };
  return {
    particleCount: 48, colors: COLORS_BASE, banner: null,
    sub: "+1 DAY", durClass: "celeb-tier-1", spin: 720,
  };
}

function pickTier1Banner(fireId) {
  return BANNER_LINES_TIER1[fireId % BANNER_LINES_TIER1.length];
}

export default function Celebration({ fireId, streak }) {
  if (!fireId) return null;

  const { tier } = celebrationTier(streak || 0);
  const cfg = tierConfig(tier);
  const bannerText = cfg.banner || pickTier1Banner(fireId);

  const particles = [];
  for (let i = 0; i < cfg.particleCount; i++) {
    const angle = (i / cfg.particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const dist = 220 + Math.random() * 320;
    const color = cfg.colors[i % cfg.colors.length];
    const size = 5 + Math.random() * 8;
    const delay = Math.random() * 0.2;
    const rotSpin = (Math.random() - 0.5) * cfg.spin * 2;
    const duration = 1.3 + Math.random() * 0.9;
    particles.push(
      <div
        key={i}
        className={`celeb-particle ${i % 3 === 0 ? "celeb-particle-sq" : ""}`}
        style={{
          "--tx": `${Math.cos(angle) * dist}px`,
          "--ty": `${Math.sin(angle) * dist}px`,
          "--color": color,
          "--size": `${size}px`,
          "--delay": `${delay}s`,
          "--rot": `${rotSpin}deg`,
          "--dur": `${duration}s`,
        }}
      />
    );
  }

  return (
    <div className={`celebration ${cfg.durClass}`} key={fireId}>
      <div className="celeb-flash" />
      <div className="celeb-banner">{bannerText}</div>
      <div className="celeb-banner-sub">{cfg.sub}</div>
      <div className="celeb-particles">{particles}</div>
    </div>
  );
}
