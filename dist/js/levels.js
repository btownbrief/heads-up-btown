// Six themed paths. Each step introduces a different skill; no paid unlocks.
export const chapters = [
  {
    id: "first",
    name: "Find your rhythm",
    emoji: "✨",
    description: "Familiar answers. A little more confidence with every round.",
    rows: [
      ["The first three", ["warmup", "kids"], "classic", "1", 60, 3],
      ["Animal magnetism", ["animals", "pet-chaos"], "classic", "mixed", 60, 4],
      ["Snack-sized clues", ["food", "kitchen"], "word", "1", 60, 4],
      ["Move your feet", ["act-general", "pet-chaos"], "act", "mixed", 60, 4],
      ["Pass it around", ["everyday", "warmup"], "one", "mixed", 60, 5],
      [
        "A confident finish",
        ["warmup", "food", "animals"],
        "classic",
        "ramp",
        60,
        6,
      ],
    ],
  },
  {
    id: "local",
    name: "The hometown trail",
    emoji: "🍁",
    description: "From a warm welcome to deeply Vermont.",
    rows: [
      ["Welcome to Btown", ["newcomer"], "classic", "1", 60, 3],
      [
        "A taste of home",
        ["eat", "sugar-season", "market-basket"],
        "classic",
        "mixed",
        60,
        4,
      ],
      ["Out by the lake", ["lake", "lake-charades"], "act", "mixed", 60, 4],
      [
        "The neighborhood round",
        ["church", "south-end", "north-end"],
        "one",
        "mixed",
        75,
        5,
      ],
      [
        "A word to the locals",
        ["vermont", "rural-vt", "seasons"],
        "word",
        "mixed",
        60,
        5,
      ],
      [
        "Vermont, on hard mode",
        ["towns", "vt-icons", "sugar-season", "winter-kit"],
        "classic",
        "3",
        75,
        6,
      ],
    ],
  },
  {
    id: "stage",
    name: "Take the stage",
    emoji: "🎭",
    description: "Bodies, voices, and a room full of brave performances.",
    rows: [
      ["The silent treatment", ["act-general"], "act", "1", 60, 3],
      ["Pet project", ["pet-chaos"], "act", "mixed", 60, 4],
      [
        "Main character moment",
        ["superpowers", "fairytales"],
        "accent",
        "mixed",
        60,
        4,
      ],
      ["Only one word", ["jobs", "toolbox"], "word", "mixed", 60, 5],
      ["Do you hear it?", ["songs"], "hum", "mixed", 75, 5],
      ["A Vermont performance", ["act", "lake-charades"], "act", "3", 75, 6],
    ],
  },
  {
    id: "culture",
    name: "Culture club",
    emoji: "🍿",
    description: "Screen time finally pays off.",
    rows: [
      ["Movie warm-up", ["movies"], "classic", "1", 60, 3],
      [
        "Character study",
        ["characters", "fairytales"],
        "classic",
        "mixed",
        60,
        4,
      ],
      ["Remember the 2000s?", ["nineties"], "one", "mixed", 60, 4],
      ["Name that tune", ["songs"], "hum", "mixed", 60, 5],
      [
        "No obvious clues",
        ["movies", "tv", "characters"],
        "forbidden",
        "mixed",
        75,
        5,
      ],
      [
        "The deep cuts",
        ["movies", "music", "tv", "games"],
        "classic",
        "3",
        60,
        6,
      ],
    ],
  },
  {
    id: "clever",
    name: "Think sideways",
    emoji: "🧠",
    description: "Better clues beat longer clues.",
    rows: [
      [
        "Tools of the trade",
        ["jobs", "toolbox", "kitchen"],
        "classic",
        "mixed",
        60,
        3,
      ],
      ["Space to think", ["space", "science"], "one", "mixed", 60, 4],
      [
        "Say it differently",
        ["food", "animals", "warmup"],
        "forbidden",
        "mixed",
        75,
        4,
      ],
      [
        "A tiny catastrophe",
        ["tiny-disasters", "office"],
        "word",
        "mixed",
        75,
        5,
      ],
      ["Brainwave", ["space", "science"], "classic", "3", 75, 5],
      [
        "The forbidden finale",
        ["movies", "food", "animals", "warmup", "jobs"],
        "forbidden",
        "mixed",
        60,
        6,
      ],
    ],
  },
  {
    id: "final",
    name: "Party legends",
    emoji: "🏆",
    description: "Shorter clocks. Sharper clues. A little glory.",
    rows: [
      [
        "Thirty-second sprint",
        ["warmup", "kids", "animals"],
        "classic",
        "1",
        30,
        3,
      ],
      [
        "Winter in a word",
        ["winter-kit", "seasons", "foliage"],
        "word",
        "mixed",
        45,
        4,
      ],
      ["Wedding theater", ["wedding", "tiny-disasters"], "act", "mixed", 45, 4],
      [
        "No time for obvious",
        ["food", "movies", "animals"],
        "forbidden",
        "mixed",
        45,
        5,
      ],
      [
        "A hard act to follow",
        ["act-general", "pet-chaos", "superpowers"],
        "act",
        "3",
        60,
        5,
      ],
      [
        "The Btown grand finale",
        ["church", "vermont", "towns", "only-here", "vt-icons", "sugar-season"],
        "one",
        "ramp",
        60,
        7,
      ],
    ],
  },
];
export const levels = chapters.flatMap((chapter, chapterIndex) =>
  chapter.rows.map(
    ([name, deckIds, rule, difficulty, seconds, target], index) => ({
      id: `${chapter.id}-${index + 1}`,
      chapter: chapter.id,
      number: chapterIndex * 6 + index + 1,
      index,
      name,
      deckIds,
      rule,
      difficulty,
      seconds,
      targets: [target, target + 3, target + 6],
    }),
  ),
);
export const levelById = (id) => levels.find((l) => l.id === id);
export const starsFor = (level, score) =>
  level.targets.filter((t) => score >= t).length;
export function isUnlocked(level, progress = {}) {
  return (
    level.index === 0 ||
    (progress[`${level.chapter}-${level.index}`]?.stars || 0) > 0
  );
}
export function awardLevel(progress, level, session) {
  const score = session.rounds.reduce((n, r) => n + r.score, 0),
    stars = starsFor(level, score),
    previous = progress[level.id] || {};
  return {
    ...previous,
    best: Math.max(previous.best || 0, score),
    stars: Math.max(previous.stars || 0, stars),
    attempts:
      (previous.attempts || 0) + (previous.lastSession === session.id ? 0 : 1),
    lastSession: session.id,
    lastScore: score,
    lastStars: stars,
  };
}
