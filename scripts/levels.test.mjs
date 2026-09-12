import test from "node:test";
import assert from "node:assert/strict";
import {
  levels,
  chapters,
  starsFor,
  isUnlocked,
  awardLevel,
} from "../dist/js/levels.js";
import { eligibleCards } from "../dist/js/engine.js";
import { decks } from "../dist/js/decks.js";
test("every challenge has enough real eligible cards to reach all three stars", () => {
  assert.equal(levels.length, 36);
  assert.equal(new Set(levels.map((l) => l.id)).size, 36);
  for (const l of levels) {
    assert(l.targets.every((t, i) => i === 0 || t > l.targets[i - 1]));
    assert(eligibleCards(decks, l.deckIds, l).length >= l.targets[2], l.id);
    assert(l.deckIds.every((id) => decks.some((d) => d.id === id)));
  }
});
test("every path starts open and a star unlocks exactly the next level", () => {
  for (const ch of chapters) {
    const [a, b, c] = levels.filter((l) => l.chapter === ch.id);
    assert(isUnlocked(a));
    assert(!isUnlocked(b));
    assert(isUnlocked(b, { [a.id]: { stars: 1 } }));
    assert(!isUnlocked(c, { [a.id]: { stars: 3 } }));
  }
});
test("stars require the actual threshold and cannot exceed three", () => {
  const l = levels[0];
  assert.equal(starsFor(l, 2), 0);
  assert.equal(starsFor(l, 3), 1);
  assert.equal(starsFor(l, 6), 2);
  assert.equal(starsFor(l, 9), 3);
  assert.equal(starsFor(l, 999), 3);
});
test("a replay keeps the best score and cannot inflate attempts by reopening results", () => {
  const l = levels[0],
    p = {};
  const first = { id: "one", rounds: [{ score: 9 }] };
  p[l.id] = awardLevel(p, l, first);
  assert.equal(p[l.id].attempts, 1);
  p[l.id] = awardLevel(p, l, first);
  assert.equal(p[l.id].attempts, 1);
  p[l.id] = awardLevel(p, l, { id: "two", rounds: [{ score: 3 }] });
  assert.equal(p[l.id].best, 9);
  assert.equal(p[l.id].stars, 3);
  assert.equal(p[l.id].lastStars, 1);
  assert.equal(p[l.id].attempts, 2);
});
test("score corrections are reflected in the finalized result", () => {
  const l = levels[0];
  assert.equal(
    awardLevel({}, l, { id: "one", rounds: [{ score: 2 }] }).stars,
    0,
  );
  assert.equal(
    awardLevel({}, l, { id: "one", rounds: [{ score: 3 }] }).stars,
    1,
  );
});
