// Stat cards that sit above the daily progress bar.
// - Streak / Done — big gradient cards
// - Best / Week — smaller summary strip (tick-style to match YearStrip)

import { useEffect, useRef } from "react";
import Odometer from "./Odometer";
import { activeHabitsOn } from "../gamification";

// Streak tier → flame appearance. Returns null for < 3 days (no flame).
function streakFlameTier(n) {
  if (n < 3) return null;
  if (n < 10) return { cls: "t1", label: "cold" };
  if (n < 20) return { cls: "t2", label: "warm" };
  if (n < 35) return { cls: "t3", label: "hot" };
  if (n < 50) return { cls: "t4", label: "burning" };
  return { cls: "t5", label: "inferno" };
}

// Per-tier radial gradient stops (inner → mid → outer).
// Yellow-friendly low tiers, deeper red as streak grows.
const TIER_STOPS = {
  t1: ["#fff8d6", "#ffae3a", "#ff7018"], // golden orange (3-9d)
  t2: ["#fff5d6", "#ff8a18", "#d04010"], // amber (10-19d)
  t3: ["#fff5d6", "#ff7018", "#b01010"], // red-orange (20-34d)
  t4: ["#fff8a0", "#ff4818", "#80060a"], // crimson (35-49d)
  t5: ["#ffffff", "#ff5060", "#e8102a"], // brand-red inferno (50+)
};

// V3 flame: multi-tongue silhouette with JS Perlin-like path morph
// (summed-sine noise on top control points). Base waypoints stay
// fixed so the body reads as unified while the peaks live freely.
// Particles rise from below and small detached tongues float off
// the top — both procedural via JS.
function Flame({ tier }) {
  const stops = TIER_STOPS[tier.cls] || TIER_STOPS.t1;
  const gid = `fg-${tier.cls}`;
  const pathRef = useRef(null);
  const particlesRef = useRef(null);
  const tonguesRef = useRef(null);

  // Path morph via summed-sine noise on the upper-half control points.
  // Base path: M 35 96 C 10 95, 4 78, 4 60 C 6 36, lcx lcy, lx ly C 22 14, 24 22, 28 lvy C 32 18, 34 8, cx_ cy C 36 8, 38 18, 42 rvy C 46 22, rcx rcy, rx ry C 66 36, 60 95, 35 96 Z
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    let t = 0, raf;
    const noise = (x) => Math.sin(x * 1.0) * 0.5 + Math.sin(x * 2.3) * 0.3 + Math.sin(x * 4.7) * 0.2;
    const FREQ = 1.5, AMP = 7, PEAK = 2.2;
    function frame() {
      t += 0.016;
      const n = (seed) => noise(t * FREQ + seed) * AMP;
      const lx  = 16 + n(10);
      const ly  = 8  + n(20) * PEAK;
      const lvy = 28 + n(25) * 1.3;
      const cx_ = 35 + n(30) * 0.7;
      const cy  = 4  + n(40) * PEAK;
      const rvy = 28 + n(50) * 1.3;
      const rx  = 54 + n(60);
      const ry  = 8  + n(70) * PEAK;
      const lcx = 12 + n(80) * 0.4;
      const lcy = 16 + n(90) * 0.6;
      const rcx = 48 + n(100) * 0.4;
      const rcy = 14 + n(110) * 0.6;
      path.setAttribute("d",
        `M 35 96 C 10 95, 4 78, 4 60 C 6 36, ${lcx.toFixed(2)} ${lcy.toFixed(2)}, ${lx.toFixed(2)} ${ly.toFixed(2)} ` +
        `C 22 14, 24 22, 28 ${lvy.toFixed(2)} C 32 18, 34 8, ${cx_.toFixed(2)} ${cy.toFixed(2)} ` +
        `C 36 8, 38 18, 42 ${rvy.toFixed(2)} C 46 22, ${rcx.toFixed(2)} ${rcy.toFixed(2)}, ${rx.toFixed(2)} ${ry.toFixed(2)} ` +
        `C 66 36, 60 95, 35 96 Z`);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Procedural particles + rising tongues
  useEffect(() => {
    const pStage = particlesRef.current;
    const tStage = tonguesRef.current;

    // Static rising particles — generated once, loop via CSS animation
    if (pStage && pStage.children.length === 0) {
      for (let i = 0; i < 8; i++) {
        const p = document.createElement("div");
        p.className = "fl-particle";
        const size = 1.4 + Math.random() * 1.4;
        const x = -8 + Math.random() * 16; // px relative to centre
        const dx = (Math.random() - 0.5) * 8;
        const dx2 = (Math.random() - 0.5) * 12;
        const dur = 1.6 + Math.random() * 0.8;
        const delay = -Math.random() * dur;
        p.style.cssText =
          `width:${size}px; height:${size}px; left:calc(50% + ${x}px);` +
          `--dx:${dx}px; --dx2:${dx2}px;` +
          `animation: fl-rise ${dur}s ${delay}s infinite cubic-bezier(0.4,0,0.6,0.6);`;
        pStage.appendChild(p);
      }
    }

    // Detached rising tongues — spawn loop
    let timeoutId;
    const TONGUE_PATHS = [
      "M 8 0 C 5 5 2 10 2 16 C 2 22 5 24 8 24 C 11 24 14 22 14 16 C 14 10 11 5 8 0 Z",
      "M 8 2 C 4 6 2 12 4 18 C 5 22 7 24 8 24 C 9 24 11 22 12 18 C 14 12 12 6 8 2 Z",
      "M 8 1 C 4 8 2 14 4 19 C 6 23 8 24 8 24 C 8 24 10 23 12 19 C 14 14 12 8 8 1 Z",
    ];
    function spawnTongue() {
      if (!tStage) return;
      const el = document.createElement("div");
      el.className = "fl-tongue";
      const w = 6 + Math.random() * 3;
      const h = 9 + Math.random() * 5;
      const dur = 1.4 + Math.random() * 0.8;
      const tx1 = (Math.random() - 0.5) * 3;
      const tx2 = tx1 + (Math.random() - 0.5) * 5;
      const tx3 = tx2 + (Math.random() - 0.5) * 6;
      const tx4 = tx3 + (Math.random() - 0.5) * 7;
      const path = TONGUE_PATHS[Math.floor(Math.random() * TONGUE_PATHS.length)];
      const c = Math.random();
      const fillColor = c < 0.5 ? stops[1] : (c < 0.85 ? stops[2] : stops[0]);
      el.innerHTML = `<svg viewBox="0 0 16 24" width="${w}" height="${h}"><path d="${path}" fill="${fillColor}"/></svg>`;
      el.style.cssText =
        `--tx1:${tx1}px; --tx2:${tx2}px; --tx3:${tx3}px; --tx4:${tx4}px;` +
        `animation: fl-tongue-rise ${dur}s ease-out forwards;`;
      tStage.appendChild(el);
      setTimeout(() => el.remove(), dur * 1000);
    }
    function loop() {
      spawnTongue();
      timeoutId = setTimeout(loop, 700 + Math.random() * 700);
    }
    timeoutId = setTimeout(loop, Math.random() * 600);
    return () => clearTimeout(timeoutId);
  }, [tier.cls]);

  return (
    <div className={`flame flame-${tier.cls}`} aria-hidden>
      <div className="fl-particles" ref={particlesRef}></div>
      <div className="fl-tongues" ref={tonguesRef}></div>
      <svg viewBox="0 0 70 100" fill="none">
        <defs>
          <radialGradient id={gid} cx="50%" cy="78%" r="62%">
            <stop offset="0%" stopColor={stops[0]} />
            <stop offset="40%" stopColor={stops[1]} />
            <stop offset="100%" stopColor={stops[2]} />
          </radialGradient>
        </defs>
        <path ref={pathRef} fill={`url(#${gid})`}
          d="M 35 96 C 10 95, 4 78, 4 60 C 6 36, 12 16, 16 8 C 22 14, 24 22, 28 28 C 32 18, 34 8, 35 4 C 36 8, 38 18, 42 28 C 46 22, 48 14, 54 8 C 66 36, 60 95, 35 96 Z"/>
      </svg>
    </div>
  );
}

export function BigStat({ label, value, unit, accent, odometer, subText }) {
  const flameTier = label === "Streak" ? streakFlameTier(Number(value) || 0) : null;
  return (
    <div className="stat-card">
      <div className="sc-label">{label}</div>
      <div className={`sc-value ${accent === "plain" ? "plain" : ""} ${accent === "done-all" ? "done-all" : ""}`}>
        {odometer ? <Odometer value={Number(value) || 0} /> : value}
        {unit && <span className="unit">{unit}</span>}
        {flameTier && <Flame tier={flameTier} />}
      </div>
      {subText && <div className="sc-subtext">{subText}</div>}
    </div>
  );
}

export function BestStat({ best }) {
  return (
    <div className="stat-small">
      <span className="ss-label">Best</span>
      <span className={`ss-value ${best > 0 ? "r" : ""}`}>{best}d</span>
    </div>
  );
}

// Week indicator using the same tick style as YearStrip — rectangles that fill
export function WeekStat({ weekDays, today, habits, days }) {
  return (
    <div className="stat-small">
      <span className="ss-label">Week</span>
      <div className="ws-ticks">
        {weekDays.map((wd, i) => {
          const x = days[wd];
          const dayHabits = activeHabitsOn(habits, wd);
          const done = x && x.checks && dayHabits.length > 0 && dayHabits.every(h => x.checks[h.id]);
          const hasData = x && x.checks && Object.keys(x.checks).length > 0;
          const isToday = wd === today;
          const future = wd > today;
          const cls = [
            "ws-tick",
            done ? "done" : "",
            isToday ? "current" : "",
            future ? "future" : "",
            hasData && !done && !future ? "partial" : "",
          ].filter(Boolean).join(" ");
          return <div key={i} className={cls} style={{ animationDelay: `${i * 0.04}s` }} />;
        })}
      </div>
    </div>
  );
}

// 7-day week strip for WeekTab — big top indicator, matches YearStrip
export function WeekBigStrip({ weekDays, today, habits, days }) {
  return (
    <div className="wbs">
      <div className="wbs-label">
        <div className="wbs-title">THIS WEEK</div>
        <div className="wbs-sub">{countDone(weekDays, habits, days)}/7 clean</div>
      </div>
      <div className="wbs-track">
        {weekDays.map((wd, i) => {
          const x = days[wd];
          const dayHabits = activeHabitsOn(habits, wd);
          const dc = dayHabits.filter(h => x && x.checks && x.checks[h.id]).length;
          const tc = x && x.tasks ? x.tasks.filter(t => t.done).length : 0;
          const tt = x && x.tasks ? x.tasks.length : 0;
          const tot = dc + tc;
          const mx = dayHabits.length + tt;
          const p = mx > 0 ? tot / mx : 0;
          const done = p === 1 && mx > 0;
          const partial = p > 0 && !done;
          const isToday = wd === today;
          const future = wd > today;
          const dayName = new Date(wd + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
          const dayNum = parseInt(wd.split("-")[2]);
          const cls = [
            "wbs-tick",
            done ? "done" : "",
            isToday ? "current" : "",
            future ? "future" : "",
            partial ? "partial" : "",
          ].filter(Boolean).join(" ");
          return (
            <div key={i} className="wbs-cell">
              <div className={cls} style={{ animationDelay: `${i * 0.06}s`, "--p": p }} title={`${dayName} ${dayNum} — ${Math.round(p * 100)}%`} />
              <div className="wbs-day-name">{dayName.slice(0, 3).toUpperCase()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function countDone(weekDays, habits, days) {
  return weekDays.filter(d => {
    const x = days[d];
    const dayHabits = activeHabitsOn(habits, d);
    return x && x.checks && dayHabits.length > 0 && dayHabits.every(h => x.checks[h.id]);
  }).length;
}
