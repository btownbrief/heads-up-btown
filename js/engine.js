// HEADS UP, BURLINGTON — pure game engine. No DOM, no Date.now(), no storage.
// Time arrives as a millisecond number; randomness arrives as a seed. Everything
// here is deterministic so scripts/test-engine.mjs can pin it down.

export const ROUND_LENGTHS = [60, 90];
export const DEFAULT_SECONDS = 60;
export const COUNTDOWN_SECONDS = 3;

// ------------------------------------------------------------ randomness
export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Cards the table has not seen come first, shuffled; then the rest, shuffled.
// `seen` is a list of card ids. When every card has been seen the caller
// should clear `seen` and start over — this function just orders.
export function buildQueue(cards, seed, seen = []) {
  const seenSet = new Set(seen);
  const rng = mulberry32(typeof seed === 'number' ? seed : hashSeed(String(seed)));
  const fresh = cards.filter((c) => !seenSet.has(c.id));
  const old = cards.filter((c) => seenSet.has(c.id));
  return shuffle(fresh, rng).concat(shuffle(old, rng));
}

// ------------------------------------------------------------ round state
// phase: 'countdown' → 'playing' → 'done'
export function createRound({ deckId, queue, seconds = DEFAULT_SECONDS }) {
  if (!Array.isArray(queue) || queue.length === 0) throw new Error('empty queue');
  if (!ROUND_LENGTHS.includes(seconds)) throw new Error(`bad round length ${seconds}`);
  return {
    deckId, queue, seconds,
    phase: 'countdown',
    index: 0,
    results: [],
    startedAt: null,
    endedAt: null,
    reason: null, // 'time' | 'deck-exhausted'
  };
}

export function startPlaying(state, now) {
  if (state.phase !== 'countdown') return state;
  return { ...state, phase: 'playing', startedAt: now };
}

export function currentCard(state) {
  return state.phase === 'playing' ? state.queue[state.index] || null : null;
}

// Seconds left, rounded up so the display never shows 0 while still playing.
export function timeLeft(state, now) {
  if (state.phase === 'countdown') return state.seconds;
  if (state.phase === 'done') return 0;
  const left = state.seconds - (now - state.startedAt) / 1000;
  return Math.max(0, Math.ceil(left - 1e-9));
}

export function tick(state, now) {
  if (state.phase !== 'playing') return state;
  if (now - state.startedAt >= state.seconds * 1000) {
    return { ...state, phase: 'done', endedAt: now, reason: 'time' };
  }
  return state;
}

// verdict: 'got' | 'pass'
export function mark(state, verdict, now) {
  if (state.phase !== 'playing') return state;
  if (verdict !== 'got' && verdict !== 'pass') throw new Error(`bad verdict ${verdict}`);
  const card = state.queue[state.index];
  if (!card) return state;
  const results = state.results.concat([{ id: card.id, t: card.t, h: card.h, verdict, at: now - state.startedAt }]);
  const index = state.index + 1;
  if (index >= state.queue.length) {
    return { ...state, results, index, phase: 'done', endedAt: now, reason: 'deck-exhausted' };
  }
  return { ...state, results, index };
}

export function summary(state) {
  const got = state.results.filter((r) => r.verdict === 'got');
  const passed = state.results.filter((r) => r.verdict === 'pass');
  return { got, passed, score: got.length, seen: state.results.length };
}

// ------------------------------------------------------------ share text
export function shareText(state, deckName, url) {
  const { got, passed } = summary(state);
  const lines = [`Heads Up, Burlington 🧠 ${deckName}: ${got.length} got, ${passed.length} passed`];
  if (got.length) lines.push(`✅ ${got.map((r) => r.t).join(' · ')}`);
  if (passed.length) lines.push(`❌ ${passed.map((r) => r.t).join(' · ')}`);
  lines.push(url);
  return lines.join('\n');
}

// ------------------------------------------------------------ tilt
// From DeviceOrientation beta/gamma (degrees) work out where the screen is
// pointing. Derived from the W3C rotation matrix, so it does not care whether
// the phone is portrait or landscape, or which way the sensor's euler angles
// happen to wrap:
//   zUp = vertical component of the screen normal  (+1 face-up, -1 face-down, 0 vertical)
//   xUp = vertical component of the device x axis   (+1 right edge up, -1 left edge up)
export function orientationVector(beta, gamma) {
  const b = (beta * Math.PI) / 180;
  const g = (gamma * Math.PI) / 180;
  return { zUp: Math.cos(b) * Math.cos(g), xUp: -Math.sin(g) * Math.cos(b) };
}

export const TILT = { fire: 0.5, rearm: 0.25, holdSamples: 3 };

export function createTiltState() {
  return { armed: false, run: 0, runDir: 0 };
}

// Feed one sensor sample. Returns { state, gesture } where gesture is
// null | 'got' (screen tipped toward the floor) | 'pass' (tipped toward the ceiling).
// A gesture fires only after the phone has been roughly vertical (armed) and
// then held past the threshold for a few samples; it must return to vertical
// before the next one can fire.
export function feedTilt(state, zUp) {
  let { armed, run, runDir } = state;
  if (Math.abs(zUp) < TILT.rearm) {
    return { state: { armed: true, run: 0, runDir: 0 }, gesture: null };
  }
  if (!armed) return { state: { armed, run: 0, runDir: 0 }, gesture: null };
  const dir = zUp <= -TILT.fire ? -1 : zUp >= TILT.fire ? 1 : 0;
  if (dir === 0) return { state: { armed, run: 0, runDir: 0 }, gesture: null };
  run = dir === runDir ? run + 1 : 1;
  runDir = dir;
  if (run >= TILT.holdSamples) {
    return { state: { armed: false, run: 0, runDir: 0 }, gesture: dir < 0 ? 'got' : 'pass' };
  }
  return { state: { armed, run, runDir }, gesture: null };
}
