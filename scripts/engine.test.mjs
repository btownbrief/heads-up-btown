import test from "node:test";
import assert from "node:assert/strict";
import * as E from "../dist/js/engine.js";
import { decks } from "../dist/js/decks.js";
const cards = Array.from({ length: 20 }, (_, i) => ({
  id: `c${i}`,
  t: `Answer ${i}`,
  d: (i % 3) + 1,
}));
test("aliases and accent differences cannot bypass freshness", () => {
  assert.equal(
    E.cardKey({ t: "Church Street Marketplace" }),
    E.cardKey({ t: "Church Street" }),
  );
  assert.equal(
    E.cardKey({ t: "Crème brûlée" }),
    E.cardKey({ t: "Creme brulee" }),
  );
  assert.equal(
    E.cardKey({ t: "Ben & Jerry's (Church Street Scoop Shop)" }),
    E.cardKey({ t: "Ben & Jerry's" }),
  );
  assert.equal(
    E.uniqueCards([{ t: "UVM" }, { t: "The University of Vermont" }]).length,
    1,
  );
});
test("fresh queue never recycles; complete exhaustion returns empty", () => {
  const seen = Object.fromEntries(
    cards.map((c) => [E.cardKey(c), { at: 123 }]),
  );
  assert.deepEqual(E.freshQueue(cards, seen), []);
  delete seen[E.cardKey(cards[8])];
  assert.deepEqual(
    E.freshQueue(cards, seen).map((c) => c.id),
    ["c8"],
  );
});
test("selected mixed decks deduplicate and filter before randomization", () => {
  const pool = E.eligibleCards(decks, ["church", "newcomer"]);
  assert.equal(new Set(pool.map(E.cardKey)).size, pool.length);
  assert(pool.some((c) => c.deckId === "church"));
  assert(pool.some((c) => c.deckId === "newcomer"));
  const hard = E.eligibleCards(
    decks,
    decks.map((d) => d.id),
    { difficulty: "3", rule: "forbidden" },
  );
  assert(hard.length > 10);
  assert(hard.every((c) => c.d === 3 && c.ban.length === 3));
});
test("hum-only rule excludes unmarked songs and other answers", () => {
  const pool = E.eligibleCards(decks, ["songs", "church"], { rule: "hum" });
  assert(pool.length > 50);
  assert(pool.every((c) => c.kind === "song"));
});
test("ramp respects bands and does not add known cards", () => {
  const queue = E.freshQueue(cards, {}, () => 0.5, "ramp");
  assert(queue.every((c, i) => !i || c.d >= queue[i - 1].d));
});
test("ramp actually reaches harder bands as time passes, even in large decks", () => {
  let s = E.createRound(cards, { seconds: 60, difficulty: "ramp" }, 0);
  s = E.selectRampCard(s, 1000);
  assert.equal(s.queue[s.index].d, 1);
  s = E.scoreCard(s, "got", 21000);
  s = E.selectRampCard(s, 21000);
  assert.equal(s.queue[s.index].d, 2);
  s = E.scoreCard(s, "got", 41000);
  s = E.selectRampCard(s, 41000);
  assert.equal(s.queue[s.index].d, 3);
  assert.equal(new Set(s.queue.map((c) => c.id)).size, cards.length);
});
test("late input cannot score after the deadline", () => {
  const s = E.createRound(cards, { seconds: 30 }, 1000);
  const end = E.scoreCard(s, "got", 31000);
  assert.equal(end.phase, "done");
  assert.equal(end.score, 0);
  assert.equal(end.results[0].verdict, "unanswered");
});
test("double taps are ignored without consuming an extra card", () => {
  const s = E.createRound(cards, { seconds: 60 }, 0);
  const a = E.scoreCard(s, "got", 1000),
    b = E.scoreCard(a, "got", 1100);
  assert.equal(a, b);
  assert.equal(b.index, 1);
});
test("pass limit and pass time penalty work together", () => {
  let s = E.createRound(
    cards,
    { seconds: 30, passLimit: 3, passPenalty: 2 },
    0,
  );
  for (const t of [1000, 2000, 3000]) s = E.scoreCard(s, "pass", t);
  assert.equal(s.deadline, 24000);
  assert.equal(s.passes, 3);
  assert.equal(E.scoreCard(s, "pass", 4000), s);
  assert.equal(E.scoreCard(s, "got", 4000).score, 1);
});
test("a penalty ending the clock never exposes another answer", () => {
  let s = E.createRound(cards, { seconds: 30, passPenalty: 5 }, 0);
  s = E.scoreCard(s, "pass", 28000);
  assert.equal(s.phase, "done");
  assert.equal(s.reason, "penalty");
  assert.equal(s.results.length, 1);
});
test("streak bonus starts with the third correct, resets on pass, caps at ten", () => {
  let s = E.createRound(cards, { seconds: 60, streak: true }, 0);
  for (let i = 1; i <= 10; i++) s = E.scoreCard(s, "got", i * 1000);
  assert.equal(s.bonus, 10);
  assert.equal(s.deadline, 70000);
  assert.equal(s.bestStreak, 10);
  s = E.scoreCard(s, "pass", 11000);
  assert.equal(s.streak, 0);
});
test("pause, resume and elapsed timestamps exclude the break", () => {
  let s = E.createRound(cards, { seconds: 60 }, 1000);
  s = E.pauseRound(s, 11000);
  assert.equal(E.secondsLeft(s, 50000), 50);
  assert.equal(E.scoreCard(s, "got", 51000), s);
  s = E.resumeRound(s, 111000);
  assert.equal(E.secondsLeft(s, 111000), 50);
  s = E.scoreCard(s, "got", 112000);
  assert.equal(s.results[0].at, 11000);
});
test("pausing after time up cannot revive a round", () => {
  const s = E.pauseRound(E.createRound(cards, { seconds: 30 }, 0), 31000);
  assert.equal(s.phase, "done");
  assert.equal(E.resumeRound(s, 32000), s);
});
test("empty pool is explicit and final card ends a round once", () => {
  assert.throws(() => E.createRound([], { seconds: 60 }, 0));
  const s = E.scoreCard(
    E.createRound(cards.slice(0, 1), { seconds: 60 }, 0),
    "got",
    1000,
  );
  assert.equal(s.reason, "exhausted");
  assert.equal(s.score, 1);
  assert.equal(E.finishRound(s, 2000), s);
});
test("score corrections adjust points, not elapsed time", () => {
  let s = E.createRound(cards, { seconds: 30 }, 0);
  s = E.scoreCard(s, "pass", 1000);
  s = E.finishRound(s, 31000);
  const c = E.correctResult(s, 0, "got");
  assert.equal(c.score, 1);
  assert.equal(c.deadline, s.deadline);
  assert.equal(c.results[0].verdict, "got");
});
test("teams get equal turns with uneven rosters", () => {
  const players = [
    { id: "a1", team: "A" },
    { id: "a2", team: "A" },
    { id: "b1", team: "B" },
  ];
  const turns = E.schedule(players, "teams", 2);
  assert.deepEqual(
    turns.map((t) => t.playerId),
    ["a1", "b1", "a2", "b1", "a1", "b1", "a2", "b1"],
  );
  assert.equal(turns.filter((t) => t.lap === 1).length, 4);
  assert.throws(() => E.schedule(players.slice(0, 2), "teams", 1));
});
test("scoreboard includes zero scores and both teams", () => {
  const s = {
    mode: "teams",
    teamNames: ["A team", "B team"],
    players: [
      { id: "a", team: "A" },
      { id: "b", team: "B" },
    ],
    rounds: [{ playerId: "b", score: 7 }],
  };
  assert.deepEqual(
    E.scoreboard(s).map((p) => [p.name, p.score]),
    [
      ["B team", 7],
      ["A team", 0],
    ],
  );
});
test("custom parser handles lists, duplicate answers and optional clue data", () => {
  const c = E.parseCustom(
    "Our people",
    "1. Apple | easy | fruit, red, pie\n2. Banana\n* Cherry\n- Orange\nPear\nApple",
  );
  assert.equal(c.cards.length, 5);
  assert.equal(c.removed, 1);
  assert.equal(c.cards[0].d, 1);
  assert.deepEqual(c.cards[0].ban, ["fruit", "red", "pie"]);
  assert.throws(() => E.parseCustom("Too short", "A\nB"));
  assert.throws(() =>
    E.parseCustom("Bad bans", "Apple | easy | fruit, pie\nB\nC\nD\nE"),
  );
});
test("tilt requires upright arming, deliberate hold and neutral reset", () => {
  let s = { armed: false, dir: 0, since: 0 };
  let x = E.feedTilt(s, -1, 0);
  assert.equal(x.gesture, null);
  x = E.feedTilt(x.state, 0, 50);
  x = E.feedTilt(x.state, -0.8, 100);
  assert.equal(x.gesture, null);
  x = E.feedTilt(x.state, -0.8, 359);
  assert.equal(x.gesture, null);
  x = E.feedTilt(x.state, -0.8, 360);
  assert.equal(x.gesture, "got");
  x = E.feedTilt(x.state, -0.9, 900);
  assert.equal(x.gesture, null);
  x = E.feedTilt(x.state, 0, 1000);
  x = E.feedTilt(x.state, 0.8, 1100);
  x = E.feedTilt(x.state, 0.8, 1400);
  assert.equal(x.gesture, "pass");
});
test("brief nods reset the hold and cannot produce false triggers", () => {
  let x = E.feedTilt({ armed: false, dir: 0, since: 0 }, 0, 0);
  x = E.feedTilt(x.state, -0.7, 100);
  x = E.feedTilt(x.state, -0.3, 200);
  x = E.feedTilt(x.state, -0.7, 250);
  x = E.feedTilt(x.state, -0.7, 400);
  assert.equal(x.gesture, null);
});
test("orientation math works in portrait and landscape", () => {
  assert(Math.abs(E.orientationVector(90, 0)) < 0.0001);
  assert(Math.abs(E.orientationVector(0, 90)) < 0.0001);
  assert(E.orientationVector(140, 0) < -0.6);
  assert(E.orientationVector(40, 0) > 0.6);
});

test("custom import rejects unknown or inherited difficulty names instead of saving invalid cards", () => {
  for (const difficulty of ["expert", "constructor", "__proto__", "toString"])
    assert.throws(
      () =>
        E.parseCustom(
          "Test",
          `First | ${difficulty}\nSecond\nThird\nFourth\nFifth`,
        ),
      /Card 1: difficulty must/,
    );
  assert.equal(
    E.parseCustom("Test", "First | EASY\nSecond\nThird\nFourth\nFifth").cards[0]
      .d,
    1,
  );
});
test("custom import reports duplicate forbidden clues and extra columns", () => {
  assert.throws(
    () =>
      E.parseCustom(
        "Test",
        "First | easy | cat, Cat, dog\nSecond\nThird\nFourth\nFifth",
      ),
    /three different/,
  );
  assert.throws(
    () =>
      E.parseCustom(
        "Test",
        "First | easy | cat, dog, bird | extra\nSecond\nThird\nFourth\nFifth",
      ),
    /use answer/,
  );
});
