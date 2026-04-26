// Tier-Up Cinematic — fires ONCE when crossing a streak threshold for
// the first time (7, 14, 30, 100, 200, 365). Replaces the standard
// celebration on that close. Persists to data.celebratedThresholds so
// it never re-fires for the same threshold.
//
// Each threshold has a unique theme + label. The render structure is
// shared (banner + threshold number explosion + ring + particles) but
// styling varies per tier.

const THEMES = {
  7:   { eyebrow: "FIRST WEEK",       big: "7",   label: "DAYS LOCKED",     duration: 5000, theme: "t7" },
  14:  { eyebrow: "FORTNIGHT",        big: "14",  label: "DAYS STRAIGHT",   duration: 5500, theme: "t14" },
  30:  { eyebrow: "FULL MONTH",       big: "30",  label: "DAYS UNBROKEN",   duration: 6000, theme: "t30" },
  100: { eyebrow: "TRIPLE DIGITS",    big: "100", label: "DAYS RELENTLESS", duration: 7000, theme: "t100" },
  200: { eyebrow: "TWO HUNDRED",      big: "200", label: "DAYS UNTOUCHABLE",duration: 7000, theme: "t200" },
  365: { eyebrow: "ONE YEAR CLEAN",   big: "365", label: "ASCENDED",        duration: 8000, theme: "t365" },
};

export const TIER_UP_THRESHOLDS = [7, 14, 30, 100, 200, 365];

export default function TierUp({ threshold, fireId }) {
  if (!threshold || !fireId) return null;
  const theme = THEMES[threshold];
  if (!theme) return null;

  // 80 particles in a circular fan
  const particles = [];
  const count = threshold >= 100 ? 200 : 120;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
    const dist = 280 + Math.random() * 380;
    const size = 4 + Math.random() * 9;
    const delay = Math.random() * 0.25;
    const duration = 1.6 + Math.random() * 1.2;
    particles.push(
      <div
        key={i}
        className={`tierup-particle ${i % 4 === 0 ? "tierup-particle-sq" : ""}`}
        style={{
          "--tx": `${Math.cos(angle) * dist}px`,
          "--ty": `${Math.sin(angle) * dist}px`,
          "--size": `${size}px`,
          "--delay": `${delay}s`,
          "--dur": `${duration}s`,
        }}
      />
    );
  }

  return (
    <div className={`tierup tierup-${theme.theme}`} key={fireId}
         style={{ "--theme-dur": `${theme.duration}ms` }}>
      <div className="tierup-flash" />
      <div className="tierup-rings">
        <div className="tierup-ring" />
        <div className="tierup-ring tierup-ring-2" />
        <div className="tierup-ring tierup-ring-3" />
      </div>
      <div className="tierup-banner">
        <div className="tierup-eyebrow">{theme.eyebrow}</div>
        <div className="tierup-big">{theme.big}</div>
        <div className="tierup-label">{theme.label}</div>
      </div>
      <div className="tierup-particles">{particles}</div>
    </div>
  );
}
