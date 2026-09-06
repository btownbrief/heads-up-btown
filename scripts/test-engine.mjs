// Offline tests for js/engine.js. Run: node scripts/test-engine.mjs
import assert from 'node:assert/strict';
import {
  hashSeed, mulberry32, shuffle, buildQueue, createRound, startPlaying, currentCard,
  timeLeft, tick, mark, summary, shareText, orientationVector, createTiltState, feedTilt, TILT,
} from '../js/engine.js';

const cards = Array.from({ length: 6 }, (_, i) => ({ id: `c${i}`, t: `Card ${i}`, h: `Hint ${i}` }));
let n = 0;
const test = (name, fn) => { fn(); n++; console.log('ok', name); };

test('seeded shuffle is deterministic and a permutation', () => {
  const a = shuffle(cards, mulberry32(7));
  const b = shuffle(cards, mulberry32(7));
  assert.deepEqual(a, b);
  assert.deepEqual(a.map((c) => c.id).sort(), cards.map((c) => c.id).sort());
  assert.notDeepEqual(shuffle(cards, mulberry32(8)), a);
});

test('hashSeed is stable', () => {
  assert.equal(hashSeed('btown'), hashSeed('btown'));
  assert.notEqual(hashSeed('btown'), hashSeed('btowm'));
});

test('buildQueue puts unseen cards first', () => {
  const q = buildQueue(cards, 'seed', ['c0', 'c1']);
  assert.equal(q.length, 6);
  const firstFour = q.slice(0, 4).map((c) => c.id);
  assert.ok(!firstFour.includes('c0') && !firstFour.includes('c1'));
  assert.deepEqual(q.slice(4).map((c) => c.id).sort(), ['c0', 'c1']);
});

test('round: countdown → playing → time up', () => {
  let s = createRound({ deckId: 'd', queue: cards, seconds: 60 });
  assert.equal(s.phase, 'countdown');
  assert.equal(currentCard(s), null);
  assert.equal(timeLeft(s, 0), 60);
  s = startPlaying(s, 1000);
  assert.equal(s.phase, 'playing');
  assert.equal(currentCard(s).id, 'c0');
  assert.equal(timeLeft(s, 1000), 60);
  assert.equal(timeLeft(s, 1000 + 59_500), 1);
  assert.equal(tick(s, 1000 + 59_999).phase, 'playing');
  const done = tick(s, 1000 + 60_000);
  assert.equal(done.phase, 'done');
  assert.equal(done.reason, 'time');
  assert.equal(timeLeft(done, 999_999), 0);
  assert.equal(mark(done, 'got', 0), done, 'no marks after done');
});

test('mark advances and records got/pass; deck exhaustion ends the round', () => {
  let s = startPlaying(createRound({ deckId: 'd', queue: cards.slice(0, 3), seconds: 60 }), 0);
  s = mark(s, 'got', 1000);
  s = mark(s, 'pass', 2000);
  assert.equal(s.index, 2);
  assert.equal(currentCard(s).id, 'c2');
  s = mark(s, 'got', 3000);
  assert.equal(s.phase, 'done');
  assert.equal(s.reason, 'deck-exhausted');
  const sum = summary(s);
  assert.equal(sum.score, 2);
  assert.deepEqual(sum.passed.map((r) => r.id), ['c1']);
  assert.throws(() => mark(startPlaying(createRound({ deckId: 'd', queue: cards }), 0), 'maybe', 0));
});

test('bad inputs throw', () => {
  assert.throws(() => createRound({ deckId: 'd', queue: [], seconds: 60 }));
  assert.throws(() => createRound({ deckId: 'd', queue: cards, seconds: 45 }));
});

test('share text', () => {
  let s = startPlaying(createRound({ deckId: 'd', queue: cards, seconds: 60 }), 0);
  s = mark(s, 'got', 1); s = mark(s, 'pass', 2);
  const txt = shareText(s, 'Eat Btown', 'https://play.btownbrief.com/heads-up-btown/');
  assert.equal(txt.split('\n')[0], 'Heads Up, Burlington 🧠 Eat Btown: 1 got, 1 passed');
  assert.match(txt, /✅ Card 0/);
  assert.match(txt, /❌ Card 1/);
  assert.match(txt, /play\.btownbrief\.com\/heads-up-btown\/$/);
  assert.ok(!/undefined|NaN/.test(txt));
});

test('orientationVector: flat, vertical portrait, vertical landscape', () => {
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(near(orientationVector(0, 0).zUp, 1), 'flat face-up');
  assert.ok(near(orientationVector(180, 0).zUp, -1), 'flat face-down');
  assert.ok(near(orientationVector(90, 0).zUp, 0), 'portrait upright');
  assert.ok(near(orientationVector(0, -90).zUp, 0), 'landscape upright');
  assert.ok(orientationVector(0, -90).xUp > 0.99, 'right edge up');
  assert.ok(orientationVector(0, 90).xUp < -0.99, 'left edge up');
  // portrait, tipped 60° toward the floor / ceiling
  assert.ok(orientationVector(150, 0).zUp < -0.8);
  assert.ok(orientationVector(30, 0).zUp > 0.8);
});

test('tilt: fires once per dip, needs vertical to re-arm, ignores jitter', () => {
  let st = createTiltState();
  let g;
  // Starting face-down (phone in hand, screen to floor) must NOT fire.
  ({ state: st, gesture: g } = feedTilt(st, -0.9)); assert.equal(g, null);
  ({ state: st, gesture: g } = feedTilt(st, -0.9)); assert.equal(g, null);
  ({ state: st, gesture: g } = feedTilt(st, -0.9)); assert.equal(g, null);
  // Raise to forehead: arms.
  ({ state: st, gesture: g } = feedTilt(st, 0.05)); assert.equal(g, null); assert.equal(st.armed, true);
  // One jittery sample past threshold does not fire.
  ({ state: st, gesture: g } = feedTilt(st, -0.8)); assert.equal(g, null);
  ({ state: st, gesture: g } = feedTilt(st, -0.3)); assert.equal(g, null);
  // A held dip fires 'got' exactly once.
  const fired = [];
  for (let i = 0; i < TILT.holdSamples + 3; i++) { ({ state: st, gesture: g } = feedTilt(st, -0.8)); if (g) fired.push(g); }
  assert.deepEqual(fired, ['got']);
  // Still down: nothing more. Back to vertical, then up: 'pass'.
  ({ state: st, gesture: g } = feedTilt(st, -0.9)); assert.equal(g, null);
  ({ state: st, gesture: g } = feedTilt(st, 0.1)); assert.equal(g, null);
  const up = [];
  for (let i = 0; i < TILT.holdSamples; i++) { ({ state: st, gesture: g } = feedTilt(st, 0.7)); if (g) up.push(g); }
  assert.deepEqual(up, ['pass']);
});

console.log(`\n${n} engine tests passed`);
