import { resolveDeckIds } from './catalog.js';
import { cardKey } from './engine.js';
const KEY = "hub-party-v1";
export const defaults = {
  catalogVersion: 2,
  group: "The usual crowd",
  selected: ["warmup"],
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
    difficulty: "familiar",
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
export function migrateCatalogState(state) {
  if ((state.catalogVersion || 0) >= 2) return state;
  state.selected = resolveDeckIds(Array.isArray(state.selected) ? state.selected : defaults.selected);
  // Existing rounds keep their original queue, clock, and rules. Future turns can
  // resolve the retired deck IDs; group history and challenge records stay intact.
  if (Array.isArray(state.session?.deckIds)) state.session.deckIds = resolveDeckIds(state.session.deckIds);
  if (state.setup.difficulty === 'mixed') state.setup.difficulty = 'familiar';
  for (const group of Object.values(state.groups)) {
    if (!group || typeof group !== 'object') continue;
    const seen = new Map();
    for (const [oldKey, record] of Object.entries(group.seen || {})) {
      const key = cardKey({t:oldKey});
      if (!seen.has(key) || (record?.at || 0) > (seen.get(key)?.at || 0)) seen.set(key, record);
    }
    group.seen = Object.fromEntries(seen);
  }
  state.catalogVersion = 2;
  return state;
}
export function loadState() {
  try {
    const x = JSON.parse(localStorage.getItem(KEY));
    if (!x || typeof x !== "object") return structuredClone(defaults);
    return migrateCatalogState({
      ...structuredClone(defaults),
      ...x,
      catalogVersion: x.catalogVersion || 0,
      settings: { ...defaults.settings, ...x.settings },
      setup: { ...structuredClone(defaults.setup), ...x.setup },
      custom: Array.isArray(x.custom) ? x.custom : [],
      history: Array.isArray(x.history) ? x.history : [],
      groups: x.groups && typeof x.groups === "object" ? x.groups : {},
      group:
        typeof x.group === "string" && x.group.trim()
          ? x.group
          : defaults.group,
    });
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
