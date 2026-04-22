// Fires when the day closes (all habits + all tasks at 100%).
// Re-fires every time the transition <100% → 100% happens, so unchecking
// a task and re-completing it triggers the payload again.
//
// Payload: full-screen banner + radial particle burst + soft red flash.
// Auto-unmounts after ~2s.

const PARTICLE_COUNT = 48;
const COLORS = ["#e8102a", "#ff4d6d", "#ff6fb2", "#ffffff"];
const BANNER_LINES = [
  "DAY CLEAN",
  "LOCKED IN",
  "PERFECT DAY",
  "FULL CLEAR",
  "DISCIPLINE WINS",
  "CLOSED",
  "SHIPPED",
  "ALL GREEN",
];

// Deterministic pick per fire ID so the banner rotates.
function pickBanner(fireId) {
  return BANNER_LINES[fireId % BANNER_LINES.length];
}

export default function Celebration({ fireId }) {
  if (!fireId) return null;

  const particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const dist = 220 + Math.random() * 260;
    const color = COLORS[i % COLORS.length];
    const size = 5 + Math.random() * 7;
    const delay = Math.random() * 0.15;
    const rotSpin = (Math.random() - 0.5) * 720;
    const duration = 1.3 + Math.random() * 0.6;
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
    // key={fireId} forces full remount on each fire, resetting all animations
    <div className="celebration" key={fireId}>
      <div className="celeb-flash" />
      <div className="celeb-banner">{pickBanner(fireId)}</div>
      <div className="celeb-banner-sub">+1 DAY</div>
      <div className="celeb-particles">{particles}</div>
    </div>
  );
}
