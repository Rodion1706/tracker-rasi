// Web Audio synth — multiple sound packs for the check-tick.
// Opt-in via localStorage 'soundOn'. Pack selection via 'soundPack'.
// Plus a separate playLuckyBurst() for the random-burst lottery hit.

let audioCtx = null;
function getCtx() {
  if (audioCtx) return audioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  } catch { return null; }
}

export function isSoundOn() {
  try { return localStorage.getItem("soundOn") === "1"; } catch { return false; }
}
export function setSoundOn(on) {
  try { localStorage.setItem("soundOn", on ? "1" : "0"); } catch {}
}

export const SOUND_PACKS = [
  { id: "tick",  name: "TICK",  desc: "Clean Apple-style click" },
  { id: "chime", name: "CHIME", desc: "Soft melodic bell" },
  { id: "mech",  name: "MECH",  desc: "Mechanical keyboard click" },
  { id: "wood",  name: "WOOD",  desc: "Wooden tap" },
  { id: "bass",  name: "BASS",  desc: "Low boom thump" },
];

export function getSoundPack() {
  try { return localStorage.getItem("soundPack") || "tick"; } catch { return "tick"; }
}
export function setSoundPack(id) {
  try { localStorage.setItem("soundPack", id); } catch {}
}

// ── Synth recipes ──
function ramp(g, ctx, peak, attackS, releaseS) {
  const now = ctx.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(peak, now + attackS);
  g.gain.exponentialRampToValueAtTime(0.0001, now + attackS + releaseS);
}

function packTick(ctx) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(620, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.07);
  ramp(g, ctx, 0.22, 0.005, 0.075);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.09);
}

function packChime(ctx) {
  // Two harmonized sines, longer release
  const fundamentals = [880, 1320];
  fundamentals.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f, ctx.currentTime);
    ramp(g, ctx, i === 0 ? 0.18 : 0.09, 0.005, 0.42);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.45);
  });
}

function packMech(ctx) {
  // Square wave, very short — simulates plastic key click
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(820, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.03);
  ramp(g, ctx, 0.16, 0.002, 0.035);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.04);
}

function packWood(ctx) {
  // Filtered noise burst — knock-like
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.06, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const g = ctx.createGain();
  filter.type = "bandpass";
  filter.frequency.value = 1100;
  filter.Q.value = 4;
  src.buffer = buf;
  ramp(g, ctx, 0.42, 0.002, 0.06);
  src.connect(filter); filter.connect(g); g.connect(ctx.destination);
  src.start();
}

function packBass(ctx) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(120, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.18);
  ramp(g, ctx, 0.28, 0.005, 0.2);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + 0.22);
}

const RECIPES = {
  tick:  packTick,
  chime: packChime,
  mech:  packMech,
  wood:  packWood,
  bass:  packBass,
};

export function playTick(packIdOverride) {
  if (!isSoundOn()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const id = packIdOverride || getSoundPack();
  const fn = RECIPES[id] || RECIPES.tick;
  try { fn(ctx); } catch {}
}

// Lucky burst — bigger, brighter sound regardless of pack. Played on a
// random-lottery check hit. Always rings even if the regular pack is
// quiet, so the lucky hit feels distinct.
export function playLuckyBurst() {
  if (!isSoundOn()) return;
  const ctx = getCtx();
  if (!ctx) return;
  try {
    // Triad rising chime
    const notes = [880, 1109, 1318]; // A5 C#6 E6
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(f, ctx.currentTime + i * 0.04);
      const start = ctx.currentTime + i * 0.04;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.22, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
      o.connect(g); g.connect(ctx.destination);
      o.start(start); o.stop(start + 0.5);
    });
  } catch {}
}
