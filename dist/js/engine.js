// Pure rules. Clock values and randomness are supplied by the caller.
export const normalize = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/^(?:the|an|a) /, "")
    .replace(/\s+/g, " ")
    .trim();
const aliases = new Map();
for (const group of [
  ["Church Street", "Church Street Marketplace"],
  ["UVM", "The University of Vermont", "UVM Campus (University of Vermont)"],
  ["The Flynn", "Flynn Center for the Performing Arts"],
  [
    "Ben & Jerry's",
    "Ben & Jerry's scoop shop",
    "Ben & Jerry's (Church Street Scoop Shop)",
  ],
  [
    "The bike path",
    "The Greenway",
    "Burlington Bike Path",
    "Burlington Bike Path (The Greenway)",
  ],
  [
    "The causeway",
    "Colchester Causeway",
    "Island Line Trail & Lake Champlain Causeway",
  ],
  ["The bike ferry", "Local Motion (Bike & Ferry)"],
  ["The Lake Monsters", "Vermont Lake Monsters"],
  ["Catamounts", "The Catamounts", "UVM Catamounts"],
  ["The Gut", "Gutterson Fieldhouse", "UVM Hockey at Gutterson Fieldhouse"],
  ["The FRAME", "The Moran FRAME", "The Moran Frame"],
  ["ECHO", "ECHO Leahy Center for Lake Champlain", "ECHO & the Boathouse", "ECHO science museum"],
  ["Red Rocks", "Red Rocks Park"],
  ["The Unitarian Church", "First Unitarian Universalist"],
  ["Lake Champlain Chocolates", "Lake Champlain Chocolates (Factory Store)"],
  ["City Market", "City Market / Onion River Co-op"],
  ["Fiddlehead", "Fiddlehead Brewing Company"],
  ["Switchback", "Switchback Brewing Co."],
  ["The Alchemist", "The Alchemist Brewery"],
  ["Hill Farmstead", "Hill Farmstead Brewery"],
  ["BCA Center", "BCA Center (old Firehouse)", "Burlington City Arts"],
  ["Leunig's Bistro", "Leunig's Bistro & Café"],
  ["American Flatbread", "American Flatbread (Burlington Hearth)"],
  ["August First", "August First Bakery & Café"],
  ["The OP", "The Other Place", "The Other Place (OP)"],
  ["Rock Point", "Lone Rock Point", "Rock Point (Lone Rock Point)"],
  ["The Intervale", "Intervale Center"],
  ["Earth Clock at Oakledge Park", "Oakledge Earth Clock"],
  ["South End Art Hop", "Art Hop"],
  ["The farmers market", "Burlington Farmers Market"],
  [
    "Discovery Jazz Festival",
    "Discover Jazz Festival",
    "Burlington Discover Jazz Festival",
  ],
  ["World’s Tallest Filing Cabinet", "World's Tallest Filing Cabinet"],
  ["Spirit of Ethan Allen", "Spirit of Ethan Allen III"],
  ["The Donahue Sea Caves", "Donahue Sea Caves (Winter)"],
  ["Whistling Man Schooner", "Whistling Man Schooner Company"],
  ["Burlington International Airport", "BTV Airport"],
  ["Lobster roll", "Lobster roll at Shanty"],
  ["Bird-watching", "Bird-watching at Delta Park"],
  ["Ice fishing", "Ice fishing in a shanty on Malletts Bay"],
  ["A self-checkout error", "A self-checkout unexpected item"],
  ["E.T.", "E.T. the Extra-Terrestrial"],
  ["Up", "Up (the movie)"], ["Elf", "Elf (the movie)"],
  ["U2", "U2 (the band)"], ["ABBA", "ABBA (the band)"],
  ["YMCA", "YMCA (the song)"], ["DNA", "DNA (genetic material)"],
])
  for (const name of group) aliases.set(normalize(name), normalize(group[0]));
export const cardKey = (card) =>
  aliases.get(normalize(card.answerKey || card.t)) || normalize(card.answerKey || card.t);
export function uniqueCards(cards) {
  const seen = new Set();
  return cards.filter((c) => {
    const k = cardKey(c);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
export function shuffle(cards, rng = Math.random) {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function eligibleCards(
  decks,
  ids,
  { difficulty = "mixed", rule = "classic" } = {},
) {
  return uniqueCards(
    decks
      .filter((d) => ids.includes(d.id))
      .flatMap((d) =>
        d.cards.map((c) => ({
          ...c,
          deckId: d.id,
          deckName: d.name,
          deckRule: d.rule || null,
        })),
      )
      .filter(
        (c) =>
          (difficulty === "mixed" ||
            (difficulty === "familiar" && c.d <= 2) ||
            difficulty === "ramp" ||
            c.d === Number(difficulty)) &&
          (rule !== "forbidden" || c.ban?.length === 3) &&
          (rule !== "hum" || c.kind === "song"),
      ),
  );
}
export function freshQueue(
  cards,
  seen = {},
  rng = Math.random,
  difficulty = "mixed",
) {
  const fresh = shuffle(
    cards.filter((c) => !Object.hasOwn(seen, cardKey(c))),
    rng,
  );
  // Gently ramp through three difficulty bands; preserve random order inside each.
  return difficulty === "ramp" ? fresh.sort((a, b) => a.d - b.d) : fresh;
}
export function selectRampCard(s, now) {
  if (s.options.difficulty !== "ramp" || s.phase !== "playing") return s;
  const target = Math.min(
    3,
    1 +
      Math.floor((Math.max(0, now - s.startedAt) / (s.baseSeconds * 1000)) * 3),
  );
  const remaining = s.queue.slice(s.index);
  const best = [
    target,
    ...[1, 2, 3]
      .filter((d) => d !== target)
      .sort((a, b) => Math.abs(a - target) - Math.abs(b - target)),
  ]
    .map((d) => remaining.findIndex((c) => c.d === d))
    .find((i) => i >= 0);
  if (best === undefined || best === 0) return s;
  const queue = [...s.queue],
    next = s.index + best;
  [queue[s.index], queue[next]] = [queue[next], queue[s.index]];
  return { ...s, queue };
}
export function createRound(queue, options, now) {
  if (!queue.length) throw new Error("No fresh cards left in this mix.");
  return {
    queue,
    index: 0,
    results: [],
    startedAt: now,
    deadline: now + options.seconds * 1000,
    baseSeconds: options.seconds,
    options: { passLimit: 0, passPenalty: 0, streak: false, ...options },
    streak: 0,
    bestStreak: 0,
    bonus: 0,
    score: 0,
    passes: 0,
    phase: "playing",
    pausedAt: null,
    lastAction: -Infinity,
    reason: null,
  };
}
export function secondsLeft(s, now) {
  return Math.max(0, Math.ceil((s.deadline - (s.pausedAt ?? now)) / 1000));
}
export function finishRound(s, now, reason = "time") {
  if (s.phase === "done") return s;
  const c = s.queue[s.index];
  return {
    ...s,
    phase: "done",
    pausedAt: null,
    reason,
    endedAt: now,
    results: c
      ? [
          ...s.results,
          {
            card: c,
            verdict: "unanswered",
            at: Math.max(0, now - s.startedAt),
          },
        ]
      : s.results,
  };
}
export function tick(s, now) {
  return s.phase === "playing" && now >= s.deadline ? finishRound(s, now) : s;
}
export function scoreCard(s, verdict, now) {
  if (!["got", "pass", "challenge"].includes(verdict))
    throw new Error("Unknown verdict");
  if (s.phase !== "playing") return s;
  if (now >= s.deadline) return finishRound(s, now);
  if (now - s.lastAction < 450) return s;
  if (
    verdict === "pass" &&
    s.options.passLimit > 0 &&
    s.passes >= s.options.passLimit
  )
    return s;
  const c = s.queue[s.index];
  if (!c) return finishRound(s, now, "exhausted");
  const streak = verdict === "got" ? s.streak + 1 : 0;
  const bonus = s.options.streak && streak >= 3 ? Math.min(2, 10 - s.bonus) : 0;
  const deadline =
    s.deadline +
    bonus * 1000 -
    (verdict === "pass" ? s.options.passPenalty * 1000 : 0);
  const results = [
    ...s.results,
    { card: c, verdict, at: Math.max(0, now - s.startedAt), bonus },
  ];
  const next = {
    ...s,
    results,
    index: s.index + 1,
    streak,
    bestStreak: Math.max(streak, s.bestStreak),
    score: s.score + (verdict === "got" ? 1 : 0),
    passes: s.passes + (verdict === "pass" ? 1 : 0),
    bonus: s.bonus + bonus,
    deadline,
    lastAction: now,
  };
  if (next.index >= s.queue.length)
    return { ...next, phase: "done", reason: "exhausted", endedAt: now };
  if (now >= deadline)
    return { ...next, phase: "done", reason: "penalty", endedAt: now };
  return next;
}
export function pauseRound(s, now) {
  if (s.phase !== "playing") return s;
  if (now >= s.deadline) return finishRound(s, now);
  return { ...s, phase: "paused", pausedAt: now };
}
export function resumeRound(s, now) {
  if (s.phase !== "paused") return s;
  const duration = now - s.pausedAt;
  return {
    ...s,
    phase: "playing",
    deadline: s.deadline + duration,
    startedAt: s.startedAt + duration,
    pausedAt: null,
    lastAction: now,
  };
}
export function correctResult(s, index, verdict) {
  if (
    s.phase !== "done" ||
    !["got", "pass", "challenge", "unanswered"].includes(verdict) ||
    !s.results[index]
  )
    return s;
  const results = s.results.map((r, i) =>
    i === index ? { ...r, verdict } : r,
  );
  return {
    ...s,
    results,
    score: results.filter((r) => r.verdict === "got").length,
  };
}
export function schedule(players, mode, rounds = 2) {
  let order = [...players];
  if (mode === "teams") {
    const a = players.filter((p) => p.team === "A"),
      b = players.filter((p) => p.team === "B");
    if (!a.length || !b.length) throw new Error("Each team needs a player.");
    // Equal team turns even with uneven rosters. Players rotate inside their team.
    order = [];
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      order.push(a[i % a.length], b[i % b.length]);
    }
  }
  return Array.from({ length: rounds }, (_, lap) =>
    order.map((p) => ({ playerId: p.id, lap })),
  ).flat();
}
export function scoreboard(session) {
  const players = session.players.map((p) => ({
    ...p,
    score: session.rounds
      .filter((r) => r.playerId === p.id)
      .reduce((sum, r) => sum + r.score, 0),
  }));
  return session.mode === "teams"
    ? ["A", "B"]
        .map((id, i) => ({
          id,
          name: session.teamNames[i],
          score: players
            .filter((p) => p.team === id)
            .reduce((sum, p) => sum + p.score, 0),
        }))
        .sort((a, b) => b.score - a.score)
    : players.sort((a, b) => b.score - a.score);
}
export function parseCustom(name, text) {
  if (typeof name !== "string" || !name.trim() || name.trim().length > 48)
    throw new Error("Give your deck a name, up to 48 characters.");
  if (typeof text !== "string" || text.length > 100000)
    throw new Error("That list is too large. Keep it to 500 cards.");
  const rows = text
    .split(/\r?\n/)
    .map((x) => x.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
  const cards = rows.map((row, i) => {
    const columns = row.split("|").map((x) => x.trim());
    if (columns.length > 3)
      throw new Error(`Card ${i + 1}: use answer | difficulty | three clues.`);
    const [t, level = "", banned = ""] = columns;
    if (!t || t.length > 110)
      throw new Error(`Card ${i + 1} needs 1–110 characters.`);
    const difficulties = { easy: 1, medium: 2, hard: 3, 1: 1, 2: 2, 3: 3 };
    const difficulty = level.toLowerCase();
    if (difficulty && !Object.hasOwn(difficulties, difficulty))
      throw new Error(
        `Card ${i + 1}: difficulty must be easy, medium, or hard.`,
      );
    const d = difficulty ? difficulties[difficulty] : 2;
    const ban = banned
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (
      ban.length &&
      (ban.length !== 3 ||
        ban.some((b) => b.length > 32) ||
        new Set(ban.map(normalize)).size !== 3 ||
        ban.some((b) => !normalize(b)))
    )
      throw new Error(
        `Card ${i + 1}: add exactly three different short forbidden clues.`,
      );
    return { id: "custom-" + i, t, d, ...(ban.length ? { ban } : {}) };
  });
  const dedup = uniqueCards(cards);
  if (dedup.length < 5 || dedup.length > 500)
    throw new Error(
      "Use 5–500 different cards. Duplicate answers are removed.",
    );
  return {
    name: name.trim(),
    cards: dedup,
    removed: cards.length - dedup.length,
  };
}
export function orientationVector(beta, gamma) {
  const b = (beta * Math.PI) / 180,
    g = (gamma * Math.PI) / 180;
  return Math.cos(b) * Math.cos(g);
}
export function feedTilt(state, z, now, { threshold = 0.62, hold = 260 } = {}) {
  if (!Number.isFinite(z)) return { state, gesture: null };
  if (Math.abs(z) < 0.24)
    return { state: { armed: true, dir: 0, since: now }, gesture: null };
  if (!state.armed) return { state, gesture: null };
  const dir = z < -threshold ? -1 : z > threshold ? 1 : 0;
  if (!dir) return { state: { ...state, dir: 0, since: now }, gesture: null };
  if (dir !== state.dir)
    return { state: { ...state, dir, since: now }, gesture: null };
  if (now - state.since < hold) return { state, gesture: null };
  return {
    state: { armed: false, dir: 0, since: now },
    gesture: dir < 0 ? "got" : "pass",
  };
}
