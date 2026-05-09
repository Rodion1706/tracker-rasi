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
export const DEFAULT_BANNER_LINES = [
  "DAY CLEAN",
  "LOCKED IN",
  "FULL CLEAR",
  "DISCIPLINE WINS",
  "CLOSED",
  "SHIPPED",
  "ALL GREEN",
];

function viewportBurstDistance(minBase, maxBase) {
  if (typeof window === "undefined") return minBase + Math.random() * (maxBase - minBase);
  const shortSide = Math.min(window.innerWidth || 390, window.innerHeight || 720);
  const max = Math.max(150, Math.min(maxBase, shortSide * 0.52));
  const min = Math.min(minBase, max * 0.45);
  return min + Math.random() * Math.max(36, max - min);
}

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

function pickTier1Banner(fireId, customLines) {
  const list = (customLines && customLines.length > 0) ? customLines : DEFAULT_BANNER_LINES;
  return list[fireId % list.length];
}

export default function Celebration({ fireId, streak, bannerPhrases, bannerOverride, subOverride, tierOverride, variant }) {
  if (!fireId) return null;

  const tierInfo = celebrationTier(streak || 0);
  const tier = tierOverride || tierInfo.tier;
  const cfg = tierConfig(tier);
  const bannerText = bannerOverride || cfg.banner || pickTier1Banner(fireId, bannerPhrases);
  const subText = subOverride || cfg.sub;
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 560;
  const particleCount = isMobile ? Math.min(cfg.particleCount, tier >= 4 ? 110 : 72) : cfg.particleCount;

  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const dist = viewportBurstDistance(220, 540);
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
    <div className={`celebration ${cfg.durClass} ${variant ? "celeb-" + variant : ""}`} key={fireId}>
      <div className="celeb-flash" />
      <div className="celeb-banner">{bannerText}</div>
      <div className="celeb-banner-sub">{subText}</div>
      <div className="celeb-particles">{particles}</div>
    </div>
  );
}
