// Tiny WebAudio cues. Off by default; nothing here runs until enable() is
// called from a user gesture, and nothing is loaded from the network.
let ctx = null;
let on = false;

export function setEnabled(v) {
  on = Boolean(v);
  if (on && !ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; on = false; }
  }
  if (on && ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}
export function enabled() { return on; }

function tone(freq, ms, type = 'sine', gain = 0.18, when = 0) {
  if (!on || !ctx) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.02);
}

export const cue = {
  tick: () => tone(660, 90, 'square', 0.08),
  go: () => { tone(880, 120, 'square', 0.12); tone(1320, 160, 'square', 0.12, 0.12); },
  got: () => { tone(740, 90, 'triangle', 0.16); tone(1100, 140, 'triangle', 0.16, 0.08); },
  pass: () => tone(220, 180, 'sawtooth', 0.10),
  timeUp: () => { tone(330, 220, 'square', 0.14); tone(262, 420, 'square', 0.14, 0.2); },
};
