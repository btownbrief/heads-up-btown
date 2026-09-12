const KEY = "hub-party-v1";
export const defaults = {
  group: "The usual crowd",
  selected: ["church", "warmup"],
  filter: "all",
  custom: [],
  groups: {},
  history: [],
  session: null,
  settings: {
    sound: false,
    haptics: true,
    control: "tap",
    sensitivity: "steady",
  },
  setup: {
    mode: "quick",
    seconds: 60,
    rounds: 2,
    difficulty: "mixed",
    rule: "classic",
    passLimit: 0,
    passPenalty: 0,
    streak: false,
    lightning: false,
    target: 30,
    players: [
      {
        id: "p1",
        name: "Player 1",
        team: "A",
        extra: 0,
        difficulty: "inherit",
      },
      {
        id: "p2",
        name: "Player 2",
        team: "B",
        extra: 0,
        difficulty: "inherit",
      },
    ],
    teamNames: ["Lake Monsters", "Mountain Goats"],
  },
};
export function loadState() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY));
    if (!x || typeof x !== "object") return structuredClone(defaults);
    return {
      ...structuredClone(defaults),
      ...x,
      settings: { ...defaults.settings, ...x.settings },
      setup: { ...structuredClone(defaults.setup), ...x.setup },
      custom: Array.isArray(x.custom) ? x.custom : [],
      history: Array.isArray(x.history) ? x.history : [],
      groups: x.groups && typeof x.groups === "object" ? x.groups : {},
    };
  } catch {
    return structuredClone(defaults);
  }
}
let failed = false;
export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    failed = false;
    return true;
  } catch {
    failed = true;
    return false;
  }
}
export const storageFailed = () => failed;
export function seenFor(state) {
  const k = state.group.toLowerCase().trim();
  return state.groups[k]?.seen || {};
}
export function markSeen(state, cardKey, verdict = "shown") {
  const k = state.group.toLowerCase().trim();
  if (!Object.hasOwn(state.groups, k))
    Object.defineProperty(state.groups, k, {
      value: { name: state.group, seen: {} },
      enumerable: true,
      writable: true,
      configurable: true,
    });
  state.groups[k].seen[cardKey] = { at: Date.now(), verdict };
}
export function resetMix(state, keys) {
  const seen = seenFor(state);
  for (const k of keys) delete seen[k];
}
