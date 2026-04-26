// Level-up cinematic — fires when Boss taps "TAP TO CLAIM" on the
// LevelBar. Big "LEVEL UP" banner, the new rank name, particles, and
// a hand-curated motivational line drawn from a pool of Boss-style
// quotes (no AI generation, no fluff).
//
// Auto-dismisses after ~5s. Tap anywhere to dismiss earlier.

import { useState, useEffect } from "react";

const QUOTES = [
  "Discipline beats motivation. Every time.",
  "You don't rise to motivation. You fall to systems.",
  "Subtraction is the strategy.",
  "Every no today is a yes to the operator you're becoming.",
  "Doing it once is luck. Doing it again is system.",
  "Hard now or hard later. Pick once.",
  "The work is the prize.",
  "Show up tired. The version of you who quit is fictional.",
  "Boring discipline beats inspired chaos.",
  "Compounding doesn't ask permission.",
  "You can't talk yourself into shape, but you can rep yourself there.",
  "The dragon was never the enemy. The couch was.",
  "Patience is a weapon. Wield it.",
  "Repeat until obvious.",
  "Boss closes the day.",
];

function pickQuote(levelId) {
  // Deterministic per-level so repeat plays of the same claim always
  // get the same quote, but different levels feel distinct.
  const idx = (levelId * 7 + 3) % QUOTES.length;
  return QUOTES[idx];
}

export default function LevelClaim({ fireId, level }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!fireId) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 5800);
    return () => clearTimeout(t);
  }, [fireId]);

  if (!visible || !level) return null;

  const quote = pickQuote(level.id);

  // 160 particles
  const particles = [];
  for (let i = 0; i < 160; i++) {
    const angle = (i / 160) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const dist = 320 + Math.random() * 380;
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
    <div
      className="tierup tierup-levelup"
      key={fireId}
      style={{ "--theme-dur": "5800ms" }}
      onClick={() => setVisible(false)}
    >
      <div className="tierup-flash" />
      <div className="tierup-rings">
        <div className="tierup-ring" />
        <div className="tierup-ring tierup-ring-2" />
        <div className="tierup-ring tierup-ring-3" />
      </div>
      <div className="tierup-banner levelup-banner">
        <div className="tierup-eyebrow">LEVEL UP</div>
        <div className="levelup-num">LVL {level.id}</div>
        <div className="levelup-name">{level.name}</div>
        <div className="levelup-quote">"{quote}"</div>
      </div>
      <div className="tierup-particles">{particles}</div>
    </div>
  );
}
