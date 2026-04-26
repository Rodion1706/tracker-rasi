// Two checkbox variants used across the tracker.
// RadialCheck — for tasks and overdue (round, radial gradient fill when done).
// DiamondCheck — for habits / checklist (♦ diamond clip, solid red when done).
// Both play a tick sound on transition to done (opt-in via localStorage).
//
// LOTTERY: every check has a small chance to fire a "lucky burst" — bigger
// brighter sparks burst in 12 directions instead of the usual 6 small dots.
// Variable-ratio reward = strongest dopamine schedule.

import { useState } from "react";
import { playTick, playLuckyBurst } from "../sound";

const LUCKY_CHANCE = 0.13;

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 12 L10 17 L19 7" />
    </svg>
  );
}

function Sparks({ lucky }) {
  // Normal: 6 red dots in 60deg increments. Lucky: 12 multi-colored
  // bigger particles fanning further with a longer animation.
  const count = lucky ? 12 : 6;
  return (
    <div className={`check-sparks ${lucky ? "lucky" : ""}`} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ "--i": i, "--n": count }} />
      ))}
    </div>
  );
}

export function RadialCheck({ done, onClick, className = "" }) {
  const [lucky, setLucky] = useState(false);
  function handleClick(e) {
    if (!done) {
      const isLucky = Math.random() < LUCKY_CHANCE;
      setLucky(isLucky);
      if (isLucky) playLuckyBurst(); else playTick();
    } else {
      setLucky(false);
    }
    onClick && onClick(e);
  }
  return (
    <div
      className={`check-radial ${done ? "done" : ""} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <CheckIcon />
      {done && <Sparks lucky={lucky} />}
    </div>
  );
}

export function DiamondCheck({ done, onClick, className = "" }) {
  const [lucky, setLucky] = useState(false);
  function handleClick(e) {
    if (!done) {
      const isLucky = Math.random() < LUCKY_CHANCE;
      setLucky(isLucky);
      if (isLucky) playLuckyBurst(); else playTick();
    } else {
      setLucky(false);
    }
    onClick && onClick(e);
  }
  return (
    <div
      className={`check-diamond ${done ? "done" : ""} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <CheckIcon />
      {done && <Sparks lucky={lucky} />}
    </div>
  );
}
