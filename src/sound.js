// Tiny tick sound on check complete. Web Audio API, no samples, no network.
// Opt-in via localStorage flag 'soundOn'. Default off so it doesn't surprise.

let audioCtx = null;
function getCtx() {
  if (audioCtx) return audioCtx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    return audioCtx;
  } catch (e) {
    return null;
  }
}

export function isSoundOn() {
  try { return localStorage.getItem("soundOn") === "1"; } catch { return false; }
}
export function setSoundOn(on) {
  try { localStorage.setItem("soundOn", on ? "1" : "0"); } catch {}
}

// Short clean tick — 600Hz sine, 70ms, quick decay. Feels like Apple UI.
export function playTick() {
  if (!isSoundOn()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(620, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.07);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}
