import { decks as builtins } from "./decks.js";
import * as E from "./engine.js";
import {
  chapters,
  levels,
  levelById,
  starsFor,
  isUnlocked,
  awardLevel,
} from "./levels.js";
import {
  loadState,
  saveState,
  seenFor,
  markSeen,
  resetMix,
} from "./storage.js";
import { esc, ic, toast, modal, closeModal, button, option } from "./ui.js";
const root = document.querySelector("#app");
const state = loadState();
let screen = "library",
  filter = state.filter || "all",
  query = "",
  customEdit = null,
  customDraft = { name: "", text: "" };
let countdownUntil = 0,
  timer = null,
  countdownId = null,
  wakeLock = null,
  audio = null,
  lastTickSound = -1,
  lastSaved = 0;
let tilt = { armed: false, dir: 0, since: 0 },
  motionSamples = 0,
  motionPermission = false,
  calibrating = false;
let clueIndex = 0,
  flashTimeout = null,
  noticeShown = false,
  offlineStatus = "checking",
  lastRoom = null,
  roomHidden = false;
const isRoom = new URLSearchParams(location.search).get("display") === "room";
const channel =
  typeof BroadcastChannel === "function"
    ? new BroadcastChannel("hub-party-room-v1")
    : null;
const RULES = {
  classic: {
    name: "Classic",
    emoji: "💬",
    hint: "Describe the answer. No part of the answer, spelling, or rhyming.",
  },
  one: {
    name: "One Clue Each",
    emoji: "☝️",
    hint: "One clue per person, clockwise. Tap Next clue-giver or Skip me to keep it moving.",
  },
  forbidden: {
    name: "Forbidden Words",
    emoji: "🤐",
    hint: "Describe the answer without saying it or any of the three forbidden clues.",
  },
  act: {
    name: "Act it out",
    emoji: "🎭",
    hint: "Clue-givers: gestures only. No talking, mouthing words, or pointing at letters.",
  },
  word: {
    name: "One word only",
    emoji: "1️⃣",
    hint: "Each clue is exactly one word. No answer words, spelling, or sound-alikes.",
  },
  accent: {
    name: "Character voices",
    emoji: "🎙️",
    hint: "Clue-givers use the voice on screen. Skip a voice if it feels uncomfortable.",
  },
  hum: {
    name: "Hum along",
    emoji: "🎶",
    hint: "Hum or whistle the melody. No lyrics, song titles, or artist names.",
  },
  mix: {
    name: "Party shuffle",
    emoji: "🔀",
    hint: "Classic, One Clue Each, One word only, and Character voices rotate between turns.",
  },
};
const voices = [
  "A dramatic movie trailer",
  "A sports commentator",
  "A cheerful robot",
  "A sleepy wizard",
  "An overexcited game-show host",
  "A very serious detective",
  "A nature documentary narrator",
  "A cartoon villain",
];
const allDecks = () => [...builtins, ...state.custom];
function persist() {
  if (!saveState(state) && !noticeShown) {
    noticeShown = true;
    toast(
      "Device storage is full or unavailable. This game still works, but changes may not be saved.",
    );
  }
}
function seen() {
  return seenFor(state);
}
function deckById(id) {
  return allDecks().find((d) => d.id === id);
}
state.selected = (Array.isArray(state.selected) ? state.selected : []).filter(
  (id) => deckById(id),
);
function available(config = state.setup, ids = state.selected) {
  return E.eligibleCards(allDecks(), ids, config);
}
function fresh(config = state.setup, ids = state.selected) {
  return available(config, ids).filter(
    (c) => !Object.hasOwn(seen(), E.cardKey(c)),
  );
}
function header() {
  return `<header class="site-header"><a class="brand" href="./" data-home="true"><b class="brand-mark">h!</b><span>heads up, <em>btown!</em></span></a><div class="header-links"><span class="small muted">A LITTLE LOCAL. A LOT OF LOUD.</span><button class="text-button" data-action="help">How to play</button><button class="icon-button" aria-label="Settings" data-action="settings">${ic("settings")}</button></div></header>`;
}
function nav() {
  return `<nav class="nav" aria-label="Game sections">${[
    ["library", "cards", "The deck shelf"],
    ["custom", "plus", "Your own decks"],
    ["setup", "users", "Game night"],
    ["levels", "fresh", "Challenge trail"],
  ]
    .map(
      ([s, i, l]) =>
        `<button class="${screen === s ? "active" : ""}" data-action="${s}">${ic(i)}${l}</button>`,
    )
    .join("")}</nav>`;
}
function footer() {
  return `<footer class="site-footer"><span>Made for good company. <a href="https://hub.btownbrief.com/">Back to the HUB</a></span><span class="footer-actions"><button class="text-button" data-action="offline">${offlineStatus === "ready" ? "Available offline" : offlineStatus === "saving" ? "Saving for offline…" : "Offline play"}</button><button class="text-button" data-action="credits">The little details ↗</button></span></footer>`;
}
function render() {
  const openDetails = [...document.querySelectorAll("details[open]")]
    .map((el) => el.className)
    .filter(Boolean);
  document.body.classList.toggle(
    "in-round",
    ["ready", "countdown", "playing", "paused"].includes(screen),
  );
  document.body.classList.toggle("room-mode", isRoom);
  if (window.BtownTicker) {
    if (document.body.classList.contains("in-round") || isRoom) window.BtownTicker.hide();
    else window.BtownTicker.show();
  }
  if (isRoom) {
    renderRoom(lastRoom);
    return;
  }
  if (["ready", "countdown", "playing", "paused"].includes(screen)) {
    root.innerHTML = roundView();
    return;
  }
  root.innerHTML =
    header() +
    `<main class="shell" id="main">${["library", "custom", "setup", "levels"].includes(screen) ? nav() : ""}${screen === "levels" ? levelsView() : screen === "library" ? library() : screen === "setup" ? setupView() : screen === "custom" ? customView() : screen === "recap" ? recapView() : finishView()}${footer()}</main>`;
  for (const name of openDetails) {
    const el = document.getElementsByClassName(name)[0];
    if (el?.tagName === "DETAILS") el.open = true;
  }
  broadcast();
}
function goto(s) {
  screen = s;
  render();
  window.scrollTo(0, 0);
}
function library() {
  const total = E.uniqueCards(allDecks().flatMap((d) => d.cards)).length;
  return `${state.session ? `<div class="resume-banner">${ic("play")}<div><b>Your game night is saved.</b><span>${esc(state.session.group)} · ${state.session.turn + 1} of ${state.session.schedule.length} turns</span></div>${button("Continue game", "resume-session", "dark")}</div>` : ""}<section class="library-intro"><div><div class="eyebrow">THE PHONE-ON-YOUR-FOREHEAD KIND OF FUN</div><h1>Your people. Wild guesses.</h1><p>${allDecks().length} decks. ${total.toLocaleString()} different answers. Zero awkward icebreakers.</p></div><div class="fresh-note">${ic("fresh")}<span><b>Fresh cards for your crowd.</b><br>We remember what you've played.</span></div></section><section class="feature-row"><article class="feature"><div class="feature-copy"><span class="pill">✦ THE HOMETOWN COLLECTION</span><h2>You've got the<br>home advantage.</h2><p>From Church Street to creemees.<br>How Burlington are you, really?</p><button class="button" data-action="locals">Explore ${builtins.filter((d) => d.group === "local").length} local decks ${ic("arrow")}</button></div><img class="feature-art" src="./assets/burlington.png" alt="A playful illustrated Burlington waterfront, with Champ in the lake" width="1536" height="1024"></article><article class="feature secondary"><div class="feature-copy"><span class="pill">THE WHOLE ROOM'S INVITED</span><h2>Make a night of it.</h2><p>Teams, rotating players, inside jokes.<br>One very good reason to put your phone up.</p><button class="button" data-action="setup">Set up game night ${ic("arrow")}</button></div></article></section><div class="catalog-layout"><section class="catalog"><div class="catalog-tools"><h2>Find your next favorite.</h2><label class="searchbox">${ic("search")}<input type="search" id="search" aria-label="Search decks" placeholder="Find a deck or card…" value="${esc(query)}"></label></div><div class="filter-row">${[
    ["all", "All decks"],
    ["local", "📍 Burlington & VT"],
    ["party", "Party starters"],
    ["pop", "Pop culture"],
    ["family", "Family night"],
    ["custom", "Made by you"],
  ]
    .map(
      ([id, l]) =>
        `<button class="chip ${filter === id ? "active" : ""}" aria-pressed="${filter === id}" data-filter="${id}">${l}</button>`,
    )
    .join(
      "",
    )}</div><div class="deck-grid" id="deck-grid">${cardsHTML()}</div><div class="catalog-bottom">${ic("heart")}<div><b class="small">The best deck? Your inside jokes.</b><p>Turn your group chat, family lore, or favorite coworkers into a deck.</p></div><button class="text-button" data-action="custom" aria-label="Create your own deck">${ic("arrow")}</button></div></section>${selectionPanel()}</div>`;
}
function cardsHTML() {
  return (
    allDecks()
      .filter(
        (d) =>
          (filter === "all" || d.group === filter) &&
          (!query ||
            `${d.name} ${d.blurb} ${d.cards.map((c) => c.t).join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      )
      .map((d) => {
        const n = E.uniqueCards(d.cards).filter(
          (c) => !Object.hasOwn(seen(), E.cardKey(c)),
        ).length;
        return `<article class="deck-card ${state.selected.includes(d.id) ? "selected" : ""}" style="--cover:${d.color}"><button class="deck-cover" data-preview="${d.id}" aria-label="Preview ${esc(d.name)}">${d.cover ? `<img src="./${d.cover}" alt="" loading="lazy" width="300" height="170">` : `<span class="deck-emoji" aria-hidden="true">${d.emoji}</span>`}<span class="cover-label">${d.photo ? "PHOTO DECK" : d.group === "local" ? "LOCAL FAVORITE" : d.group === "custom" ? "MADE BY YOU" : d.group === "pop" ? "POP CULTURE" : d.group.toUpperCase()}</span></button><div class="deck-info"><h3>${esc(d.name)}</h3><p>${esc(d.blurb)}</p><div class="deck-foot"><span>${d.cards.length} cards · ${n === d.cards.length ? d.level : `${n} fresh`}</span><button class="add-deck" data-toggle="${d.id}" aria-pressed="${state.selected.includes(d.id)}" aria-label="${state.selected.includes(d.id) ? "Remove" : "Add"} ${esc(d.name)}">${ic(state.selected.includes(d.id) ? "check" : "plus")}</button></div></div></article>`;
      })
      .join("") ||
    '<div class="empty"><h3>No decks found.</h3><p>Try another search or choose All decks.</p></div>'
  );
}
function selectionPanel() {
  const selected = state.selected.map(deckById).filter(Boolean);
  const n = E.uniqueCards(selected.flatMap((d) => d.cards)).length;
  return `<aside class="session-panel"><div class="eyebrow">GOOD COMPANY, GREAT GUESSES</div><h3>Your game, mixed.</h3><p class="description">Add a few decks. We'll shuffle them into one very good time.</p><ul class="selection-list">${selected.length ? selected.map((d) => `<li><span class="selection-icon">${d.emoji}</span>${esc(d.name)}<button class="remove" data-toggle="${d.id}" aria-label="Remove ${esc(d.name)} from your mix">×</button></li>`).join("") : '<li class="muted">Tap + on a deck to add it.</li>'}</ul><div class="panel-meta"><span>${selected.length} deck${selected.length === 1 ? "" : "s"} selected</span><b>${n.toLocaleString()} answers</b></div><button class="button full" data-action="play" ${!selected.length ? "disabled" : ""}>Let's play ${ic("arrow")}</button><p class="panel-note">No accounts. No paywalls. Just play.</p></aside>`;
}
function previewDeck(id) {
  const d = deckById(id);
  if (!d) return;
  const freshN = d.cards.filter(
    (c) => !Object.hasOwn(seen(), E.cardKey(c)),
  ).length;
  modal(
    d.emoji + " " + d.name,
    `<p>${esc(d.blurb)}</p><div class="preview-stats"><b>${d.cards.length}<span>cards</span></b><b>${freshN}<span>fresh for your group</span></b><b>${d.cards.filter((c) => c.ban).length}<span>forbidden prompts</span></b></div>${d.rule ? `<p class="callout">${esc(RULES[d.rule].hint)}</p>` : ""}<p class="eyebrow">A TASTE OF THE DECK · THESE ARE PREVIEWS</p><div class="sample-cards">${d.cards
      .slice(0, 6)
      .map((c) => `<span>${esc(c.t)}</span>`)
      .join(
        "",
      )}</div><p class="small muted">Previewing cards doesn't mark them as played. During a round, each answer is remembered across all decks for “${esc(state.group)}”.</p>`,
    `<button class="button" data-only="${d.id}">Play this deck ${ic("arrow")}</button><button class="button outline" data-modal-toggle="${d.id}">${state.selected.includes(id) ? "Remove from mix" : "Add to my mix"}</button>`,
  );
}
function setupView() {
  const s = state.setup,
    n = fresh().length,
    all = available().length;
  return `<section class="page-heading"><button class="text-button" data-action="library">${ic("back")} Back to the shelf</button><div class="eyebrow">LET'S MAKE A NIGHT OF IT</div><h1>A little setup. A lot of fun.</h1><p class="muted">Your people, your pace, your house rules.</p></section><div class="setup-layout"><div class="setup-main"><section class="form-section"><div class="section-heading"><span class="step">01</span><h2>Who's playing?</h2></div><div class="mode-grid">${[
    ["quick", "⚡", "Quick play", "One round. Straight to the good bit."],
    [
      "individual",
      "🙌",
      "Everyone for themselves",
      "Rotate guessers. Keep the scores.",
    ],
    ["teams", "🤝", "Team night", "Two teams. Friendly rivalry."],
    ["coop", "💚", "All together", "One shared target. Everybody wins."],
  ]
    .map(
      ([v, e, n, h]) =>
        `<button class="mode-card ${s.mode === v ? "active" : ""}" data-mode="${v}" aria-pressed="${s.mode === v}"><span>${e}</span><b>${n}</b><small>${h}</small></button>`,
    )
    .join(
      "",
    )}</div><label class="field group-field"><span>Remember fresh cards for</span><input id="group-name" value="${esc(state.group)}" maxlength="40" list="group-names" placeholder="e.g. Friday night friends"><small>Reuse this group name next time. Your card history stays on this device.</small></label><datalist id="group-names">${Object.values(
    state.groups,
  )
    .map((g) => `<option value="${esc(g.name)}"></option>`)
    .join(
      "",
    )}</datalist>${s.mode === "teams" ? `<div class="two-fields">${s.teamNames.map((name, i) => `<label class="field"><span>Team ${i ? "B" : "A"}</span><input data-team-name="${i}" value="${esc(name)}" maxlength="28"></label>`).join("")}</div>` : ""}<div class="players-header"><b>${s.mode === "quick" ? "Who's guessing?" : "The guest list"}</b>${s.mode !== "quick" ? `<span class="small muted">${s.players.length}/16 players</span>` : ""}</div><div class="players-list">${(s.mode === "quick" ? s.players.slice(0, 1) : s.players).map((p, i) => `<div class="player-line"><span class="avatar ${p.team === "B" ? "alternate" : ""}">${i + 1}</span><label class="player-name"><span class="sr-only">Player ${i + 1} name</span><input data-player-name="${p.id}" value="${esc(p.name)}" placeholder="Player ${i + 1}" maxlength="25"></label>${s.mode === "teams" ? `<select aria-label="Team for player ${i + 1}" data-player-team="${p.id}">${option("A", "Team A", p.team)}${option("B", "Team B", p.team)}</select>` : ""}<button class="icon-button" data-player-options="${p.id}" aria-label="Adjustments for player ${i + 1}">${ic("settings")}</button>${s.mode !== "quick" && s.players.length > 2 ? `<button class="text-button" data-remove-player="${p.id}" aria-label="Remove player ${i + 1}">${ic("close")}</button>` : ""}${p.extra || p.difficulty !== "inherit" ? `<small class="player-adjustment">${p.extra ? `+${p.extra} sec` : ""} ${p.difficulty !== "inherit" ? ["", "Easy", "Medium", "Hard"][+p.difficulty] + " cards" : ""}</small>` : ""}</div>`).join("")}</div>${s.mode !== "quick" ? `<button class="button outline" data-action="add-player" ${s.players.length >= 16 ? "disabled" : ""}>${ic("plus")} Add a person</button>` : ""}</section><section class="form-section"><div class="section-heading"><span class="step">02</span><h2>Set the rhythm.</h2></div><div class="three-fields"><label class="field"><span>Round length</span><select id="seconds">${[30, 60, 90, 120].map((v) => option(v, `${v} seconds`, s.seconds)).join("")}</select></label><label class="field"><span>Difficulty</span><select id="difficulty">${[
    ["mixed", "A little of everything"],
    ["1", "Easy · familiar favorites"],
    ["2", "Medium · a good challenge"],
    ["3", "Hard · deep cuts"],
    ["ramp", "Build from easy to hard"],
  ]
    .map(([v, l]) => option(v, l, s.difficulty))
    .join(
      "",
    )}</select></label>${s.mode !== "quick" ? `<label class="field"><span>${s.mode === "teams" ? "Laps through both teams" : "Turns per player"}</span><select id="rounds">${[1, 2, 3, 4, 5].map((v) => option(v, v, s.rounds)).join("")}</select></label>` : `<label class="field"><span>Controls</span><select id="control">${option("tap", "Tap / keyboard", state.settings.control)}${option("tilt", "Tilt + tap backup", state.settings.control)}</select></label>`}</div>${s.mode === "coop" ? `<label class="field"><span>Shared target</span><select id="target">${[10, 20, 30, 40, 50, 60, 75, 100].map((v) => option(v, `${v} correct answers`, s.target)).join("")}</select></label><p class="callout">Each person gets a turn, then passes the phone while the clock is stopped. All correct answers count toward the same target.</p>` : ""}${s.mode === "teams" ? '<p class="callout">Teams alternate and get equal turns. On an uneven roster, the smaller team rotates more often.</p>' : ""}</section><section class="form-section"><div class="section-heading"><span class="step">03</span><h2>Give it a twist.</h2></div><div class="rule-grid">${Object.entries(
    RULES,
  )
    .map(
      ([id, r]) =>
        `<button class="rule-card ${s.rule === id ? "active" : ""}" aria-pressed="${s.rule === id}" data-rule="${id}"><span>${r.emoji}</span>${r.name}</button>`,
    )
    .join(
      "",
    )}</div><p class="rule-explanation">${esc(RULES[s.rule]?.hint || RULES.classic.hint)}</p>${s.rule === "forbidden" ? `<p class="callout">Only cards with three hand-written forbidden clues are used. Your mix has ${all} eligible answers.</p>` : s.rule === "hum" ? '<p class="callout">Hum along uses song cards. Add the Hum along deck if your mix has none.</p>' : ""}<details class="house-rules"><summary>House rules & little extras ${ic("settings")}</summary><div class="two-fields"><label class="field"><span>Pass limit</span><select id="passLimit">${[0, 3, 5, 10].map((v) => option(v, v ? `${v} passes` : "Unlimited", s.passLimit)).join("")}</select></label><label class="field"><span>Time cost per pass</span><select id="passPenalty">${[0, 2, 3, 5].map((v) => option(v, v ? `${v} seconds` : "No penalty", s.passPenalty)).join("")}</select></label></div><label class="switch-row"><span><b>Streak sparks</b><small>Third correct in a row and onward: +2 seconds, capped at +10 per round. Quick play and co-op only.</small></span><input type="checkbox" id="streak" ${s.streak ? "checked" : ""} ${["teams", "individual"].includes(s.mode) ? "disabled" : ""}></label>${["teams", "individual"].includes(s.mode) ? `<label class="switch-row"><span><b>Lightning finish</b><small>The last lap gives everyone 30 seconds. Same scoring, faster finish.</small></span><input type="checkbox" id="lightning" ${s.lightning ? "checked" : ""}></label>` : ""}<button class="text-button" data-action="settings">${ic("settings")} Sound, tilt & accessibility</button></details></section></div><aside class="setup-summary"><div class="eyebrow">YOUR NIGHT, AT A GLANCE</div><h2>${s.mode === "quick" ? "A quick good time." : s.mode === "teams" ? "Let the rivalry begin." : s.mode === "coop" ? "We're in this together." : "Everybody gets a turn."}</h2><div class="summary-decks">${
    state.selected
      .map(deckById)
      .filter(Boolean)
      .map((d) => `<span>${d.emoji} ${esc(d.name)}</span>`)
      .join("") || "<span>No decks selected yet.</span>"
  }</div><button class="text-button" data-action="library">Edit your deck mix ${ic("arrow")}</button><dl class="summary-details"><div><dt>Fresh answers</dt><dd id="fresh-count">${n.toLocaleString()}</dd></div><div><dt>Round length</dt><dd>${s.seconds} seconds</dd></div><div><dt>Your twist</dt><dd>${esc(RULES[s.rule].name)}</dd></div><div><dt>Controls</dt><dd>${state.settings.control === "tilt" ? "Tilt + tap backup" : "Tap / keyboard"}</dd></div></dl><div id="setup-error" role="alert"></div><button class="button full" data-action="start-session" ${!state.selected.length ? "disabled" : ""}>${s.mode === "quick" ? "Start quick round" : "Start game night"} ${ic("arrow")}</button><p class="panel-note">Keep the screen facing your friends.<br>They're the clue-givers. You're the guesser.</p><button class="text-button room-open" data-action="room">${ic("screen")} Open room display</button><p class="small muted">For a second screen on this browser. Keep it out of the guesser's view.</p></aside></div>`;
}
function playerOptions(id) {
  const p = state.setup.players.find((p) => p.id === id);
  if (!p) return;
  modal(
    "Make it fair for " + p.name,
    `<p>A little extra time or easier cards can help everyone enjoy their turn. These adjustments appear in setup, not on the card.</p><div class="two-fields"><label class="field"><span>Extra seconds each turn</span><select data-extra="${id}">${[0, 10, 15, 20, 30].map((v) => option(v, v ? `+${v} seconds` : "No extra time", p.extra)).join("")}</select></label><label class="field"><span>Personal difficulty</span><select data-personal-difficulty="${id}">${[
      ["inherit", "Use group setting"],
      ["1", "Easy"],
      ["2", "Medium"],
      ["3", "Hard"],
    ]
      .map(([v, l]) => option(v, l, p.difficulty))
      .join(
        "",
      )}</select></label></div><p class="small muted">Difficulty still uses your selected decks. We'll flag an empty card pool before the session starts.</p>`,
    button("Done", "save-player-options"),
  );
}
function resolveRule(session, turn) {
  const base = session.config.rule;
  return base === "mix" ? ["classic", "one", "word", "accent"][turn % 4] : base;
}
function currentPlayer() {
  const s = state.session;
  return (
    s?.players.find((p) => p.id === s.schedule[s.turn]?.playerId) ||
    s?.players[0]
  );
}
function playerConfig(session, turn = session.turn) {
  const p = session.players.find(
    (p) => p.id === session.schedule[turn].playerId,
  );
  return {
    ...session.config,
    rule: resolveRule(session, turn),
    difficulty:
      p.difficulty === "inherit" ? session.config.difficulty : p.difficulty,
    seconds:
      (session.config.lightning &&
      session.schedule[turn].lap === session.config.rounds - 1
        ? 30
        : session.config.seconds) + (p.extra || 0),
  };
}
function startSession() {
  if (state.session?.finished) state.session = null;
  if (state.session) {
    modal(
      "Start a new game night?",
      `<p>Your current game has ${state.session.rounds.length} completed turns. Starting a new session will replace the unfinished game. Card history is kept.</p>`,
      button("Keep playing", "resume-session", "outline") +
        button("Start new session", "replace-session"),
    );
    return;
  }
  const s = structuredClone(state.setup);
  s.streak = s.streak && !["teams", "individual"].includes(s.mode);
  s.lightning = s.lightning && ["teams", "individual"].includes(s.mode);
  const players = (s.mode === "quick" ? s.players.slice(0, 1) : s.players).map(
    (p, i) => ({ ...p, name: p.name.trim() || `Player ${i + 1}` }),
  );
  s.players = players;
  s.teamNames = s.teamNames.map((n, i) => n.trim() || `Team ${i ? "B" : "A"}`);
  state.group = state.group.trim() || "The usual crowd";
  let sched;
  try {
    sched = E.schedule(players, s.mode, s.mode === "quick" ? 1 : s.rounds);
  } catch (e) {
    setupError(e.message);
    return;
  }
  const session = {
    id: crypto.randomUUID(),
    group: state.group,
    mode: s.mode,
    players,
    teamNames: s.teamNames,
    config: s,
    deckIds: [...state.selected],
    schedule: sched,
    turn: 0,
    rounds: [],
    round: null,
    startedAt: Date.now(),
  };
  for (let t = 0; t < sched.length; t++) {
    const config = playerConfig(session, t);
    const pool = fresh(config, session.deckIds);
    if (!pool.length) {
      const p = players.find((p) => p.id === sched[t].playerId);
      setupError(
        `No fresh ${config.rule === "forbidden" ? "Forbidden Words " : ""}cards fit ${p.name}'s settings. Add decks, change difficulty, or start a new card cycle.`,
      );
      return;
    }
  }
  state.session = session;
  persist();
  goto("ready");
}
function setupError(message) {
  document.querySelector("#setup-error").innerHTML =
    `<p class="error-text">${esc(message)}</p><button class="text-button" data-action="reset-cycle">Start a new card cycle</button>`;
  toast(message);
}
function nextTurn() {
  const s = state.session;
  if (!s) return;
  s.round = null;
  s.turn++;
  persist();
  if (s.turn >= s.schedule.length) {
    completeSession();
    return;
  }
  goto("ready");
}
function completeSession() {
  const s = state.session;
  if (!s) return;
  if (s.levelId) {
    const level = levelById(s.levelId);
    if (level) {
      const progress = groupProgress(s.group);
      progress[level.id] = awardLevel(progress, level, s);
      s.levelAward = progress[level.id];
    }
  }
  s.finished = true;
  state.history = [
    {
      id: s.id,
      date: Date.now(),
      group: s.group,
      mode: s.mode,
      scores: E.scoreboard(s),
      total: s.rounds.reduce((sum, round) => sum + round.score, 0),
    },
    ...state.history.filter((h) => h.id !== s.id),
  ].slice(0, 15);
  persist();
  goto("finish");
}
function resumeSession() {
  closeModal();
  const s = state.session;
  if (!s) return goto("setup");
  state.group = s.group;
  if (s.finished || s.turn >= s.schedule.length) return goto("finish");
  if (s.round?.phase === "done") return goto("recap");
  if (s.round) {
    s.round = E.tick(s.round, Date.now());
    if (s.round.phase === "done") {
      finishTurn();
      return;
    }
    s.round = E.pauseRound(s.round, Date.now());
    return goto("paused");
  }
  goto("ready");
}
function roundView() {
  const s = state.session,
    p = currentPlayer();
  if (!s || !p) return "";
  const cfg = playerConfig(s);
  const r = s.round,
    rule = RULES[cfg.rule],
    total = s.schedule.length;
  const team =
    s.mode === "teams" ? ` · ${s.teamNames[p.team === "A" ? 0 : 1]}` : "";
  if (screen === "ready")
    return `<main id="main" class="ready-screen"><div class="play-topbar"><button class="text-button" data-action="save-exit">${ic("back")} Save & leave</button><span>TURN ${s.turn + 1} OF ${total}</span><button class="icon-button" aria-label="Game settings" data-action="settings">${ic("settings")}</button></div><div class="ready-content"><span class="pill">${s.config.lightning && s.schedule[s.turn].lap === s.config.rounds - 1 ? "⚡ LIGHTNING LAP" : "THE NEXT GREAT GUESSER"}</span><div class="ready-avatar">${esc(p.name[0].toUpperCase())}</div><h1>Your turn, ${esc(p.name)}.</h1><p class="muted">${esc(s.mode === "quick" ? "Your friends give the clues." : s.mode === "teams" ? s.teamNames[p.team === "A" ? 0 : 1] + " gives the clues." : "Everyone else gives the clues.")}</p>${s.levelId ? `<p class="level-ready-target">Level ${levelById(s.levelId).number}: ${esc(levelById(s.levelId).name)} · ${levelById(s.levelId).targets[0]} correct to earn a star</p>` : ""}<div class="ready-facts"><span>${ic("clock")} ${cfg.seconds} seconds</span><span>${rule.emoji} ${rule.name}</span></div><div class="instruction-card"><b>${rule.name}</b><p>${esc(rule.hint)}</p>${s.deckIds.some((id) => deckById(id)?.rule) ? "<small>Act it out and Hum along decks keep their own clue rule on Classic turns.</small>" : ""}</div><p class="ready-direction">${ic("phone")} Phone to your forehead. Screen facing your friends.</p><button class="button dark big" data-action="begin-countdown">I'm ready ${ic("arrow")}</button><p class="small muted">${state.settings.control === "tilt" ? "Return the phone upright between tilts." : "Clue-giver: tap Pass or Got it. On a laptop, use ← and →."}</p><button class="text-button" data-action="room">${ic("screen")} Room display</button></div></main>`;
  if (screen === "countdown")
    return `<main class="countdown-screen" id="main"><button class="text-button countdown-cancel" data-action="cancel-countdown">${ic("close")} Cancel</button><div><div class="eyebrow">SCREEN TO THE ROOM. EYES OFF THE ANSWER.</div><div class="countdown-number" id="countdown-number">${Math.max(1, Math.ceil((countdownUntil - Date.now()) / 1000))}</div><h2>${esc(p.name)}, get ready.</h2></div></main>`;
  if (screen === "paused")
    return `<main class="pause-screen" id="main"><div><span class="pill">TAKE A BREATHER</span><h1>Good guesses can wait.</h1><p>${esc(p.name)} · ${E.secondsLeft(r, Date.now())} seconds left · ${r.score} correct</p><div class="pause-actions">${button("Back to the game " + ic("play"), "resume-round", "dark big")}${button("End this round", "end-round", "outline")}${button("Save & leave", "save-exit", "outline")}</div><p class="small muted">The card is hidden and the clock is stopped.</p></div></main>`;
  const card = r.queue[r.index],
    liveRule = effectiveRule(card, cfg.rule);
  const cluer = clueGivers()[clueIndex % Math.max(1, clueGivers().length)];
  const voice = voices[(r.index + s.turn) % voices.length];
  return `<main class="play-screen" id="main"><div class="play-topbar"><span><b>${esc(p.name)}</b>${esc(team)} <span class="turn-count">· ${s.turn + 1}/${total}</span></span><span class="round-rule">${RULES[liveRule].emoji} ${RULES[liveRule].name}</span><button class="icon-button" aria-label="Pause round" data-action="pause">${ic("pause")}</button></div><div class="time-track"><div id="time-bar" style="width:${Math.min(100, (E.secondsLeft(r, Date.now()) / r.baseSeconds) * 100)}%"></div></div><div class="game-hud"><span class="score-pill"><b id="round-score">${r.score}</b> correct</span><div class="timer" id="game-timer" aria-label="Seconds remaining">${E.secondsLeft(r, Date.now())}</div><span class="streak-pill">${r.streak >= 3 ? "🔥 " : ""}${r.streak} in a row${r.bonus ? ` · +${r.bonus}s` : ""}</span></div><div class="answer-stage ${card.image ? "photo-stage" : ""}"><div class="card-category">${esc(card.deckName)} <span>· ${["", "Easy", "Medium", "Hard"][card.d]}</span></div>${card.image ? `<img class="photo-prompt" src="./${card.image}" alt="Photo clue: ${esc(card.t)}"><div class="photo-instruction">Describe the scene. The guesser keeps their eyes off the screen.</div>` : ""}<h1 class="answer ${card.t.length > 44 ? "answer-long" : ""}" id="answer">${esc(card.t)}</h1>${liveRule === "forbidden" ? `<div class="forbidden"><span>DON'T SAY</span>${card.ban.map((w) => `<b>${esc(w)}</b>`).join("")}</div>` : ""}${liveRule === "one" ? `<div class="clue-rotation"><span>One clue from <b>${esc(cluer?.name || "the next person")}</b></span><button data-action="next-cluer">Next clue-giver ${ic("arrow")}</button><button data-action="next-cluer">Skip me</button></div>` : ""}${liveRule === "accent" ? `<div class="voice-prompt">Clue voice: <b>${esc(voice)}</b><button class="text-button" data-action="skip-voice">Change voice</button></div>` : ""}${["act", "hum", "word"].includes(liveRule) ? `<p class="live-rule-note">${esc(RULES[liveRule].hint)}</p>` : ""}</div><div class="game-actions"><button class="pass-button" data-action="pass" ${r.options.passLimit && r.passes >= r.options.passLimit ? "disabled" : ""}><span>←</span><b>Pass</b><small>${r.options.passLimit ? Math.max(0, r.options.passLimit - r.passes) + " left" : "Keep it moving"}${r.options.passPenalty ? " · −" + r.options.passPenalty + "s" : ""}</small></button><button class="got-button" data-action="got"><span>✓</span><b>Got it!</b><small>One very good guess →</small></button></div><div class="game-foot"><span>${state.settings.control === "tilt" ? "Tilt down ✓ · tilt up pass · return upright" : "← Pass · → Correct · Space to pause"}</span><button data-action="challenge">${ic("flag")} Rule broken?</button></div><div class="score-flash" id="score-flash" aria-live="polite"></div></main>`;
}
function effectiveRule(card, rule) {
  return rule === "classic" && card?.deckRule ? card.deckRule : rule;
}
function clueGivers() {
  const s = state.session,
    p = currentPlayer();
  return s.players.filter(
    (x) => x.id !== p.id && (s.mode !== "teams" || x.team === p.team),
  );
}
function enableAudio() {
  if (!state.settings.sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume().catch(() => {});
  } catch {}
}
function sound(kind) {
  if (!state.settings.sound || !audio) return;
  try {
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.connect(g);
    g.connect(audio.destination);
    o.type = "sine";
    o.frequency.setValueAtTime(
      kind === "got" ? 680 : kind === "end" ? 250 : kind === "pass" ? 330 : 880,
      audio.currentTime,
    );
    g.gain.setValueAtTime(0.065, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
    o.start();
    o.stop(audio.currentTime + 0.14);
  } catch {}
}
function vibrate(pattern) {
  if (state.settings.haptics && navigator.vibrate) navigator.vibrate(pattern);
}
async function requestMotion() {
  if (!window.DeviceOrientationEvent) {
    toast(
      "Motion sensors are unavailable here. Tap and keyboard controls work.",
    );
    state.settings.control = "tap";
    persist();
    return false;
  }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const grant = await DeviceOrientationEvent.requestPermission();
      if (grant !== "granted") throw new Error("denied");
    }
    motionPermission = true;
    return true;
  } catch {
    state.settings.control = "tap";
    persist();
    toast("Motion access was not enabled. Tap controls are ready.");
    return false;
  }
}
function attachMotion() {
  motionSamples = 0;
  tilt = { armed: false, dir: 0, since: 0 };
  window.addEventListener("deviceorientation", handleMotion);
}
function detachMotion() {
  window.removeEventListener("deviceorientation", handleMotion);
  calibrating = false;
  tilt = { armed: false, dir: 0, since: 0 };
}
function handleMotion(e) {
  if (e.beta == null || e.gamma == null) return;
  motionSamples++;
  const z = E.orientationVector(e.beta, e.gamma);
  if (calibrating) {
    const meter = document.querySelector("#tilt-meter");
    if (meter) meter.value = z;
    const label = document.querySelector("#tilt-status");
    if (label)
      label.textContent =
        Math.abs(z) < 0.24
          ? "Upright. Ready to play."
          : z < 0
            ? "Screen tipped down → correct"
            : "Screen tipped up → pass";
    return;
  }
  if (screen !== "playing" || Date.now() - state.session.round.startedAt < 650)
    return;
  const sensitivities = {
    gentle: { threshold: 0.48, hold: 350 },
    steady: { threshold: 0.62, hold: 260 },
    deliberate: { threshold: 0.76, hold: 300 },
  };
  const next = E.feedTilt(
    tilt,
    z,
    Date.now(),
    sensitivities[state.settings.sensitivity],
  );
  tilt = next.state;
  if (next.gesture) mark(next.gesture);
}
async function requestWake() {
  try {
    if ("wakeLock" in navigator)
      wakeLock = await navigator.wakeLock.request("screen");
  } catch {}
}
function releaseWake() {
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}
async function beginCountdown() {
  const s = state.session;
  if (!s) return;
  const cfg = playerConfig(s);
  if (!fresh(cfg, s.deckIds).length) {
    modal(
      "That mix is all played out.",
      `<p>There are no fresh cards left for this player's settings. Add more decks, or explicitly begin a new card cycle for the current mix.</p>`,
      button("Add more decks", "extend-mix", "outline") +
        button("Start a new cycle", "reset-cycle"),
    );
    return;
  }
  enableAudio();
  if (state.settings.control === "tilt" && !motionPermission)
    await requestMotion();
  countdownUntil = Date.now() + 3000;
  screen = "countdown";
  render();
  requestWake();
  if (state.settings.control === "tilt") attachMotion();
  let last = 3;
  sound("tick");
  clearInterval(countdownId);
  countdownId = setInterval(() => {
    const n = Math.ceil((countdownUntil - Date.now()) / 1000);
    if (n <= 0) {
      clearInterval(countdownId);
      countdownId = null;
      startRound();
      return;
    }
    const el = document.querySelector("#countdown-number");
    if (el) el.textContent = n;
    if (n !== last) {
      sound("tick");
      last = n;
    }
  }, 80);
}
function startRound() {
  const s = state.session,
    cfg = playerConfig(s),
    queue = E.freshQueue(
      available(cfg, s.deckIds),
      seen(),
      Math.random,
      cfg.difficulty,
    );
  s.round = E.createRound(queue, cfg, Date.now());
  clueIndex = 0;
  lastTickSound = -1;
  showCurrent();
  persist();
  screen = "playing";
  render();
  startTicker();
  if (state.settings.control === "tilt")
    setTimeout(() => {
      if (screen === "playing" && motionSamples === 0) {
        toast("No motion readings yet. Tap controls remain available.");
      }
    }, 1600);
  broadcast();
}
function showCurrent() {
  if (state.session?.round)
    state.session.round = E.selectRampCard(state.session.round, Date.now());
  const c = state.session?.round?.queue[state.session.round.index];
  if (c) markSeen(state, E.cardKey(c));
}
function startTicker() {
  clearInterval(timer);
  timer = setInterval(() => {
    const s = state.session;
    if (screen !== "playing" || !s?.round) return;
    const now = Date.now(),
      old = s.round;
    s.round = E.tick(old, now);
    if (s.round.phase === "done") {
      finishTurn();
      return;
    }
    const n = E.secondsLeft(s.round, now);
    const el = document.querySelector("#game-timer");
    if (el) {
      el.textContent = n;
      el.classList.toggle("urgent", n <= 10);
    }
    const bar = document.querySelector("#time-bar");
    if (bar)
      bar.style.width =
        Math.min(
          100,
          Math.max(
            0,
            ((s.round.deadline - now) / (s.round.baseSeconds * 1000)) * 100,
          ),
        ) + "%";
    if (n <= 5 && n !== lastTickSound) {
      sound("tick");
      lastTickSound = n;
    }
    if (now - lastSaved > 3000) {
      persist();
      lastSaved = now;
    }
    broadcast();
  }, 100);
}
function mark(verdict) {
  if (screen !== "playing" || !state.session?.round) return;
  const s = state.session,
    old = s.round;
  if (
    verdict === "pass" &&
    old.options.passLimit &&
    old.passes >= old.options.passLimit
  ) {
    toast("Pass limit reached. Keep trying, or end the round from Pause.");
    return;
  }
  s.round = E.scoreCard(old, verdict, Date.now());
  if (s.round === old) return;
  if (s.round.results.length > old.results.length) {
    markSeen(state, E.cardKey(old.queue[old.index]), verdict);
    sound(verdict);
    vibrate(verdict === "got" ? 45 : [20, 40, 20]);
  }
  if (s.round.phase === "done") {
    finishTurn();
    return;
  }
  clueIndex = 0;
  showCurrent();
  persist();
  render();
  const flash = document.querySelector("#score-flash");
  const bonus = s.round.bonus - old.bonus;
  if (flash) {
    flash.textContent =
      verdict === "got"
        ? bonus
          ? `On a roll! +1 · +${bonus}s`
          : "Got it! +1"
        : verdict === "pass"
          ? "Next one!"
          : "No point · next card";
    flash.classList.add("visible", verdict);
    clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => flash.classList.remove("visible"), 450);
  }
  broadcast();
}
function pause() {
  if (screen !== "playing") return;
  state.session.round = E.pauseRound(state.session.round, Date.now());
  if (state.session.round.phase === "done") {
    finishTurn();
    return;
  }
  clearInterval(timer);
  detachMotion();
  releaseWake();
  persist();
  goto("paused");
}
function resumeRound() {
  if (!state.session?.round) return;
  closeModal();
  state.session.round = E.resumeRound(state.session.round, Date.now());
  screen = "playing";
  if (state.settings.control === "tilt") attachMotion();
  requestWake();
  enableAudio();
  render();
  startTicker();
  persist();
}
function finishTurn() {
  const s = state.session;
  if (!s?.round) return;
  clearInterval(timer);
  detachMotion();
  releaseWake();
  s.round = E.finishRound(s.round, Date.now(), s.round.reason || "ended");
  const p = currentPlayer(),
    r = s.round;
  const summary = {
    playerId: p.id,
    playerName: p.name,
    turn: s.turn,
    score: r.score,
    results: r.results,
    rule: playerConfig(s).rule,
    bonus: r.bonus,
    bestStreak: r.bestStreak,
    reason: r.reason,
  };
  const existing = s.rounds.findIndex((x) => x.turn === s.turn);
  if (existing >= 0) s.rounds[existing] = summary;
  else s.rounds.push(summary);
  persist();
  sound("end");
  vibrate([60, 70, 60]);
  goto("recap");
}
function scoreRows(s) {
  return E.scoreboard(s)
    .map(
      (p, i) =>
        `<div class="score-row"><span class="rank">${i + 1}</span><b>${esc(p.name)}</b><span>${p.score}<small> pts</small></span></div>`,
    )
    .join("");
}
function recapView() {
  const s = state.session,
    r = s.round,
    p = currentPlayer(),
    missed = r.results.filter((x) => x.verdict !== "got"),
    isLast = s.turn + 1 >= s.schedule.length,
    total = s.rounds.reduce((a, r) => a + r.score, 0);
  return `<section class="recap-heading"><span class="pill">THAT WAS A GOOD ROUND</span><h1>${r.score >= 8 ? "You understood the assignment." : r.score >= 3 ? "Now that’s good company." : "Every guess is a good story."}</h1><p>${esc(p.name)} · ${esc(RULES[playerConfig(s).rule].name)} · Turn ${s.turn + 1} of ${s.schedule.length}</p></section><div class="recap-layout"><div><div class="result-stats"><div><b class="display">${r.score}</b><span>got it!</span></div><div><b class="display">${r.results.filter((x) => x.verdict === "pass").length}</b><span>passed</span></div><div><b class="display">${r.bestStreak}</b><span>best streak</span></div></div>${r.reason === "exhausted" ? '<p class="callout">You reached the end of the fresh cards. Every shown answer stays in your group’s history. Add more decks for your next round.</p>' : ""}${r.bonus ? `<p class="small muted bonus-note">Streak sparks added ${r.bonus} seconds. Corrections below change points; time already played stays as played.</p>` : ""}<div class="reveal-section"><div class="section-heading"><h2>“Wait, what was it?!”</h2><span class="small muted">${missed.length} to reveal</span></div>${missed.length ? `<div class="reveal-grid">${missed.map((x) => `<button class="reveal-card" data-reveal="${r.results.indexOf(x)}"><span>${x.verdict === "challenge" ? "RULE CHALLENGE" : x.verdict === "unanswered" ? (r.reason === "ended" ? "ROUND ENDED" : "TIME RAN OUT") : "THE ONE THAT GOT AWAY"}</span><b>?</b><small>Tap to reveal</small></button>`).join("")}</div>` : '<p class="perfect-note">Every card answered. Nothing left hiding. ✨</p>'}</div><details class="round-details"><summary>Round review & score corrections <span>${r.results.length} ${r.results.length === 1 ? "card" : "cards"}</span></summary><p class="small muted">Settle close calls together. These changes update the session scoreboard immediately.</p><div class="result-list">${r.results
    .map(
      (x, i) =>
        `<div class="result-line"><span>${esc(x.card.t)}${x.card.credit ? `<button class="text-button" data-photo-credit="${i}" aria-label="Photo credit for ${esc(x.card.t)}">ⓘ</button>` : ""}</span><select aria-label="Result for ${esc(x.card.t)}" data-correct="${i}">${[
          ["got", "✓ Correct"],
          ["pass", "↗ Passed"],
          ["challenge", "⚑ Rule broken"],
          ["unanswered", "— Unanswered"],
        ]
          .map(([v, l]) => option(v, l, x.verdict))
          .join("")}</select></div>`,
    )
    .join(
      "",
    )}</div></details></div><aside class="recap-sidebar"><div class="eyebrow">${s.mode === "coop" ? "OUR SHARED TARGET" : "THE NIGHT SO FAR"}</div><h2>${s.mode === "coop" ? `${total} / ${s.config.target}` : s.mode === "quick" ? "A little victory." : "Friendly competition."}</h2>${s.mode === "coop" ? `<progress value="${total}" max="${s.config.target}" aria-label="Progress toward shared target"></progress><p class="small muted">${total >= s.config.target ? "Target reached! Every extra point is a victory lap." : `${s.config.target - total} more correct guesses to reach the target.`}</p>` : `<div class="scoreboard">${scoreRows(s)}</div>`}<button class="button full" data-action="${isLast ? "final-results" : "next-turn"}">${isLast ? "The final reveal" : "Next guesser"} ${ic("arrow")}</button><button class="button outline full" data-action="share-round">${ic("share")} Share this round</button><button class="text-button" data-action="save-exit">Save & leave for now</button>${!isLast && r.reason === "exhausted" ? button("Add more decks", "extend-mix", "outline full") : ""}<p class="panel-note">Every shown card is remembered for<br>“${esc(s.group)}”.</p></aside></div>`;
}
function finishView() {
  const s = state.session;
  if (s?.levelId) return levelFinish(s);
  if (!s)
    return '<div class="empty">Your game night is ready when you are.</div>';
  const board = E.scoreboard(s),
    top = board[0]?.score || 0,
    winners = board.filter((p) => p.score === top),
    total = s.rounds.reduce((a, r) => a + r.score, 0),
    won = s.mode === "coop" && total >= s.config.target;
  return `<section class="final-screen"><div class="final-medallion">${s.mode === "coop" ? "💚" : "🏆"}</div><div class="eyebrow">${esc(s.group)} · GAME NIGHT COMPLETE</div><h1>${s.mode === "quick" ? "Good guesses. Better company." : s.mode === "coop" ? (won ? "The whole room wins." : "Same team. Next time.") : winners.length > 1 ? "Call it a shared victory." : esc(winners[0].name) + " takes the crown."}</h1><p class="muted">${s.mode === "coop" ? `${total} correct ${total === 1 ? "answer" : "answers"}. A target of ${s.config.target}. ${won ? "You did that together." : "The rematch is going to be good."}` : `${total} correct ${total === 1 ? "guess" : "guesses"} across ${s.rounds.length} ${s.rounds.length === 1 ? "round" : "rounds"}. A very good use of an evening.`}</p><div class="final-scoreboard">${scoreRows(s)}</div><div class="final-buttons">${button("Same crowd, fresh cards " + ic("fresh"), "rematch", "dark")}${button("Mix up the decks", "finish-library", "outline")}${button("Share the good stuff " + ic("share"), "share-session", "outline")}</div><p class="small muted">Your card history stays with “${esc(s.group)}”. No repeat answers until you choose a new cycle.</p></section>`;
}

function groupProgress(group = state.group) {
  state.progress ||= {};
  const key = "group:" + group.trim().toLowerCase();
  if (!Object.hasOwn(state.progress, key)) state.progress[key] = {};
  return state.progress[key];
}
function levelsView() {
  const progress = groupProgress(),
    stars = levels.reduce((n, l) => n + (progress[l.id]?.stars || 0), 0),
    clears = levels.filter((l) => progress[l.id]?.stars > 0).length;
  return `<section class="page-heading"><div class="eyebrow">36 LEVELS · SIX WAYS TO PLAY</div><h1>The challenge trail.</h1><p class="muted">One guesser, a room of clue-givers, and a goal worth shouting about. Earn one star to open the next stop in each path.</p></section><section class="trail-summary"><div><strong>${stars}<small> / 108 stars</small></strong><p>${clears} ${clears===1?"level":"levels"} cleared by ${esc(state.group)}</p></div><div><b>${clears === 36 ? "Party legends" : clears >= 24 ? "Clue masters" : clears >= 12 ? "Crowd favorites" : clears >= 6 ? "Getting good" : "A fresh adventure"}</b><p>Progress stays with this group on this device.</p><button class="text-button" data-action="setup">Change group or guesser</button></div></section><div class="trail-chapters">${chapters
    .map(
      (ch) =>
        `<section class="trail-chapter"><div class="section-heading"><span class="chapter-emoji">${ch.emoji}</span><div><h2>${ch.name}</h2><p class="muted">${ch.description}</p></div></div><div class="level-grid">${levels
          .filter((l) => l.chapter === ch.id)
          .map((l) => {
            const p = progress[l.id] || {},
              unlocked = isUnlocked(l, progress);
            return `<article class="level-card ${unlocked ? "" : "locked"}"><div class="level-number">LEVEL ${String(l.number).padStart(2, "0")}<span aria-label="${p.stars || 0} of 3 stars">${"★".repeat(p.stars || 0)}${"☆".repeat(3 - (p.stars || 0))}</span></div><h3>${l.name}</h3><p>${RULES[l.rule].name} · ${l.seconds} seconds</p><p class="level-targets">★ ${l.targets[0]} &nbsp; ★★ ${l.targets[1]} &nbsp; ★★★ ${l.targets[2]} correct</p><p class="small muted">${l.deckIds.map((id) => esc(deckById(id).name)).join(" + ")}</p><div class="level-bottom"><span class="small">${p.attempts ? `Best: ${p.best} · ${p.attempts} ${p.attempts === 1 ? "try" : "tries"}` : unlocked ? "Your next good story" : "Earn a star on the previous level"}</span><button class="button dark" data-level="${l.id}" ${unlocked ? "" : "disabled"}>${unlocked ? (p.attempts ? "Play again" : "Play level") : "Locked"}</button></div></article>`;
          })
          .join("")}</div></section>`,
    )
    .join(
      "",
    )}</div><p class="small muted">Every chapter starts open. Levels use fixed time and difficulty, with no time bonuses or handicaps. Cards stay fresh across this trail and game nights; repeating a card cycle is always your choice.</p>`;
}
function startLevel(id) {
  const l = levelById(id);
  if (!l || !isUnlocked(l, groupProgress())) return;
  if (state.session && !state.session.finished) {
    modal(
      "Keep your current game?",
      "<p>Starting this level replaces the unfinished session. Your card history and earned stars stay saved.</p>",
      button("Keep playing", "resume-session", "outline") +
        `<button class="button" data-level-replace="${id}">Start this level</button>`,
    );
    return;
  }
  const pool = fresh(l, l.deckIds);
  if (pool.length < l.targets[0]) {
    modal(
      "A few more fresh cards needed.",
      `<p>This level has ${pool.length} fresh answers left for “${esc(state.group)}” and needs ${l.targets[0]} for its first star. You can deliberately start a new cycle for these decks, or try another path.</p>`,
      button("Back to the trail", "close-modal", "outline") +
        `<button class="button" data-level-reset="${id}">Start a new card cycle</button>`,
    );
    return;
  }
  const base = state.setup.players[0] || {
      id: "p1",
      name: "Player 1",
      team: "A",
    },
    player = {
      ...base,
      name: base.name.trim() || "Player 1",
      extra: 0,
      difficulty: "inherit",
    };
  const config = {
    ...structuredClone(state.setup),
    ...l,
    mode: "quick",
    players: [player],
    rounds: 1,
    passLimit: 0,
    passPenalty: 0,
    streak: false,
    lightning: false,
  };
  state.session = {
    id: crypto.randomUUID(),
    group: state.group,
    mode: "quick",
    players: [player],
    teamNames: config.teamNames,
    config,
    deckIds: [...l.deckIds],
    schedule: E.schedule([player], "quick", 1),
    turn: 0,
    rounds: [],
    round: null,
    startedAt: Date.now(),
    levelId: id,
  };
  persist();
  goto("ready");
}
function levelFinish(s) {
  const l = levelById(s.levelId),
    score = s.rounds.reduce((n, r) => n + r.score, 0),
    stars = starsFor(l, score),
    next = levels.find(
      (x) => x.chapter === l.chapter && x.index === l.index + 1,
    ),
    award = s.levelAward || groupProgress(s.group)[l.id] || {};
  return `<section class="final-screen"><div class="level-award" aria-label="${stars} of 3 stars">${"★".repeat(stars)}${"☆".repeat(3 - stars)}</div><div class="eyebrow">LEVEL ${l.number} · ${l.name}</div><h1>${stars === 3 ? "You made that look easy." : stars ? "One step further." : "A good reason for a rematch."}</h1><p class="muted">${score} correct. ${stars ? `${stars} ${stars === 1 ? "star" : "stars"} earned.` : `${l.targets[0]} correct earns the first star.`} Your best: ${award.best || score}.</p><div class="final-buttons">${next && isUnlocked(next, groupProgress(s.group)) ? `<button class="button dark" data-level="${next.id}">Next level ${ic("arrow")}</button>` : ""}<button class="button outline" data-level="${l.id}">Try again with fresh cards</button>${button("Back to the trail", "levels", "outline")}${button("Share this round", "share-round", "outline")}</div><p class="small muted">Stars and personal bests are saved for “${esc(s.group)}”. All shown cards remain in your no-repeat history.</p></section>`;
}

function customView() {
  return `<section class="page-heading"><div class="eyebrow">THE BEST MATERIAL IS YOUR OWN</div><h1>Inside jokes. Outside voices.</h1><p class="muted">Family lore, favorite coworkers, your extremely specific friend group.</p></section><div class="custom-layout"><section class="custom-editor"><h2>${customEdit ? "Edit your deck." : "Make it personal."}</h2><form id="custom-form"><label class="field"><span>Give your deck a name</span><input id="deck-name" maxlength="48" required placeholder="e.g. The group chat, unfiltered" value="${esc(customDraft.name)}"></label><label class="field"><span>Your cards · one answer per line</span><textarea id="deck-text" rows="11" required placeholder="The office coffee machine&#10;Dad's famous pancakes&#10;That camping trip&#10;The family group chat&#10;Auntie's dance moves">${esc(customDraft.text)}</textarea><small>5–500 unique answers. Up to 110 characters each. Blank lines and duplicates are removed.</small></label><details><summary>Add difficulty & forbidden clues</summary><p class="small muted">Optional format: answer | easy, medium, or hard | three comma-separated forbidden clues</p><code class="format-example">Titanic | easy | ship, iceberg, movie</code><p class="small muted">Cards without a difficulty use Medium. Forbidden Words uses only cards with three clues.</p></details><div class="custom-actions"><button class="button dark" type="submit">${customEdit ? "Save changes" : "Create my deck"} ${ic("arrow")}</button><label class="button outline file-label">${ic("download")} Import a file<input type="file" id="import-file" accept=".txt,.json,text/plain,application/json" class="sr-only"></label>${customEdit ? button("Cancel edit", "cancel-edit", "outline") : ""}</div><div id="custom-error" role="alert"></div></form><p class="small muted">Saved on this device. Export a file for backup, or share a compact deck as a link. No account needed.</p></section><section class="custom-shelf"><h2>Your deck shelf <span class="count-badge">${state.custom.length}</span></h2>${state.custom.length ? state.custom.map((d) => `<article class="saved-deck"><div><span class="saved-emoji">✍️</span><h3>${esc(d.name)}</h3><p class="small muted">${d.cards.length} cards · saved on this device</p></div><div class="saved-actions"><button class="button small" data-only="${d.id}">Play</button><button class="icon-button" data-edit="${d.id}" aria-label="Edit ${esc(d.name)}">${ic("edit")}</button><button class="icon-button" data-share="${d.id}" aria-label="Share ${esc(d.name)}">${ic("share")}</button><button class="icon-button" data-export="${d.id}" aria-label="Export ${esc(d.name)}">${ic("download")}</button><button class="icon-button" data-delete="${d.id}" aria-label="Delete ${esc(d.name)}">${ic("close")}</button></div></article>`).join("") : `<div class="empty"><div class="empty-emoji">✍️</div><h3>That joke deserves its own card.</h3><p>Create your first deck and it will live right here.</p></div>`}<div class="custom-tip"><div class="eyebrow">A LITTLE HOST WISDOM</div><h3>Specific is funny.</h3><p>“A camping trip” is fine.<br>“Dad fighting the tent in the rain” is a whole story.</p><small>Make sure everyone playing has a way in. Save the deep cuts for Hard.</small></div></section></div>`;
}
function saveCustom() {
  try {
    const parsed = E.parseCustom(customDraft.name, customDraft.text);
    const id = customEdit || "custom-" + crypto.randomUUID();
    const d = {
      ...parsed,
      id,
      group: "custom",
      emoji: "✍️",
      blurb: "A little personal history. A lot of good guesses.",
      color: "#efd4bf",
      level: parsed.cards.every((c) => c.d === 1) ? "Easy" : "Mixed",
      cards: parsed.cards.map((c, i) => ({ ...c, id: id + "-" + i })),
    };
    const i = state.custom.findIndex((x) => x.id === id);
    if (i >= 0) state.custom[i] = d;
    else state.custom.push(d);
    persist();
    customEdit = null;
    customDraft = { name: "", text: "" };
    render();
    toast(
      `Deck saved: ${d.cards.length} cards${parsed.removed ? ` · ${parsed.removed} duplicates removed` : ""}.`,
    );
  } catch (e) {
    document.querySelector("#custom-error").textContent = e.message;
  }
}
function customText(d) {
  return d.cards
    .map(
      (c) =>
        `${c.t} | ${["", "easy", "medium", "hard"][c.d]}${c.ban ? " | " + c.ban.join(", ") : ""}`,
    )
    .join("\n");
}
function downloadJSON(d) {
  const data = JSON.stringify(
    {
      format: "heads-up-btown-deck",
      version: 1,
      name: d.name,
      cards: d.cards.map(({ t, d, ban }) => ({
        t,
        d,
        ...(ban ? { ban } : {}),
      })),
    },
    null,
    2,
  );
  const a = document.createElement("a"),
    url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  a.href = url;
  a.download = d.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function encodeDeck(d) {
  const text = JSON.stringify({
    v: 1,
    n: d.name,
    c: d.cards.map((c) => [c.t, c.d, c.ban || null]),
  });
  const bytes = new TextEncoder().encode(text);
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
async function shareDeck(id) {
  const d = deckById(id),
    code = encodeDeck(d);
  if (code.length > 8000) {
    modal(
      "This deck is better as a file.",
      `<p>Large decks can exceed messaging apps' link limits. Export ${esc(d.name)} and send the JSON file. Friends can import it from Your own decks.</p>`,
      `<button class="button" data-export="${id}">Export deck</button>`,
    );
    return;
  }
  const url = new URL(location.href);
  url.search = "";
  url.hash = "deck=" + code;
  await shareText(`Play my ${d.cards.length}-card deck: ${d.name}`, url.href);
}
let pendingShare = null;
async function shareText(text, url = "") {
  pendingShare = { text, url };
  const content = [text, url].filter(Boolean).join("\n");
  modal(
    url ? "Your deck, ready to share." : "Share the good stuff.",
    `<p>${url ? "Anyone with this link can read and import this deck." : "A little proof of a very good time."}</p><textarea id="share-content" rows="6" readonly aria-label="Share text">${esc(content)}</textarea>`,
    button("Copy " + (url ? "link" : "text"), "copy-share", "dark") +
      (navigator.share ? button("Share…", "native-share", "outline") : ""),
  );
}

function importShared() {
  if (!location.hash.startsWith("#deck=")) return;
  const code = location.hash.slice(6);
  try {
    if (code.length > 12000) throw new Error("This shared deck is too large.");
    const raw = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const x = JSON.parse(
      new TextDecoder().decode(Uint8Array.from(raw, (c) => c.charCodeAt(0))),
    );
    if (x.v !== 1 || !Array.isArray(x.c) || x.c.length > 500)
      throw new Error("This deck link is not valid.");
    const text = x.c
      .map((row) => {
        if (!Array.isArray(row) || typeof row[0] !== "string")
          throw new Error("Invalid card.");
        return `${row[0]} | ${row[1]}${Array.isArray(row[2]) ? " | " + row[2].join(",") : ""}`;
      })
      .join("\n");
    const checked = E.parseCustom(x.n, text);
    customDraft = { name: checked.name, text };
    screen = "custom";
    history.replaceState(null, "", location.pathname + location.search);
    render();
    toast("Shared deck loaded. Review it, then choose Create my deck.");
  } catch (e) {
    history.replaceState(null, "", location.pathname + location.search);
    toast("Could not open this deck link. Ask for an exported deck file.");
  }
}
async function importFile(file) {
  if (!file) return;
  if (file.size > 150000) {
    toast("Use a text or JSON file smaller than 150 KB.");
    return;
  }
  try {
    const text = await file.text();
    if (file.name.endsWith(".json")) {
      const x = JSON.parse(text);
      if (
        !Array.isArray(x.cards) ||
        x.cards.length > 500 ||
        typeof x.name !== "string"
      )
        throw new Error("Use an exported Heads Up deck JSON file.");
      const rows = x.cards
        .map((c) => {
          if (typeof c.t !== "string")
            throw new Error("A card is missing its answer.");
          return `${c.t} | ${c.d || 2}${Array.isArray(c.ban) ? " | " + c.ban.join(", ") : ""}`;
        })
        .join("\n");
      E.parseCustom(x.name, rows);
      customDraft = { name: x.name, text: rows };
    } else {
      customDraft.text = text;
      if (!customDraft.name)
        customDraft.name = file.name.replace(/\.txt$/i, "").slice(0, 48);
    }
    customEdit = null;
    render();
    toast("File loaded. Review the cards, then save your deck.");
  } catch (e) {
    toast(e.message);
  }
}
function settings() {
  modal(
    "Make yourself comfortable.",
    `<label class="switch-row"><span><b>Sound effects</b><small>Short chimes for guesses and the final countdown.</small></span><input type="checkbox" id="sound" ${state.settings.sound ? "checked" : ""}></label><label class="switch-row"><span><b>Haptic feedback</b><small>A little pulse when your browser supports vibration.</small></span><input type="checkbox" id="haptics" ${state.settings.haptics ? "checked" : ""}></label><label class="field"><span>Controls</span><select id="control">${option("tap", "Tap buttons / arrow keys", state.settings.control)}${option("tilt", "Tilt, with tap backup", state.settings.control)}</select><small>Motion needs a supported phone and permission. Tap controls always remain available.</small></label><label class="field"><span>Tilt sensitivity</span><select id="sensitivity">${option("gentle", "Gentle · smaller tilt, longer hold", state.settings.sensitivity)}${option("steady", "Steady · recommended", state.settings.sensitivity)}${option("deliberate", "Deliberate · deeper tilt", state.settings.sensitivity)}</select></label><button class="button outline" data-action="test-tilt">${ic("phone")} Enable & test tilt</button><div id="tilt-test"></div><div class="settings-info"><b>Designed for the room.</b><p>No microphone, camera, ads, or analytics. Player names, custom decks, session scores, and card history stay in this browser.</p><p>Screen readers: the answer is visible to accessibility tools. Use headphones or a sighted clue-giver if spoken output would reveal it.</p></div>`,
    button("Done", "close-settings", "dark"),
  );
}
async function testTilt() {
  if (!(await requestMotion())) return;
  state.settings.control = "tilt";
  persist();
  calibrating = true;
  attachMotion();
  document.querySelector("#tilt-test").innerHTML =
    '<div class="tilt-test"><p>Hold your phone upright with the screen facing the room. Tilt the screen toward the floor for correct, toward the ceiling to pass. Return upright between guesses.</p><meter id="tilt-meter" min="-1" max="1" value="0" aria-label="Phone tilt"></meter><b id="tilt-status">Waiting for motion…</b></div>';
  setTimeout(() => {
    const label = document.querySelector("#tilt-status");
    if (calibrating && !motionSamples && label)
      label.textContent =
        "No sensor readings. Try a supported phone, or use tap controls.";
  }, 2000);
}
function help() {
  modal(
    "Phone up. Good times ahead.",
    `<ol class="howto"><li><b>Pick your mix.</b><p>One deck or several. Name your group so seen cards stay out of future rounds.</p></li><li><b>Put the phone on your forehead.</b><p>Screen toward your friends. They give clues. You guess out loud. Never say part of the answer, spell it, or rhyme it.</p></li><li><b>Make the call.</b><p>A clue-giver taps Got it or Pass. With motion enabled, tilt the screen down for correct, up to pass, then return upright. On a laptop: → correct, ← pass, Space pause.</p></li><li><b>Enjoy the reveal.</b><p>Tap the mystery cards to reveal passes. Settle close calls in Round review before the next person goes.</p></li></ol><p class="callout">Keep the phone comfortable and secure. If tilting is awkward, let a clue-giver hold it and tap. A big room can use a second display from the same browser.</p>`,
    button("Got it. Let’s play.", "close-modal", "dark"),
  );
}
function credits() {
  modal(
    "A little local. A lot of care.",
    `<p>An independent Btown Brief party game, inspired by forehead charades. Not affiliated with the commercial Heads Up! app, Ellen DeGeneres, or Warner Bros.</p><p><b>${builtins.length} decks · ${E.uniqueCards(builtins.flatMap((d) => d.cards)).length.toLocaleString()} distinct answers.</b> Local material is adapted from Btown Brief's existing Heads Up decks, place guides, landmark map, and Where in Btown photo game. September 2026 editorial snapshot; place cards are prompts, not current business listings.</p><p>The Burlington cover is an AI-created illustration. Photography is credited to its original creators.</p><p><a href="./credits.html" target="_blank" rel="noopener">View all photo credits and content notes ↗</a></p><p class="small muted">Names and card history are saved locally. Shared custom-deck links contain the deck in the link itself; anyone with that link can read it. Group voting, live collaborative editing, voice recognition, and video recording are not part of this edition.</p>`,
  );
}
function resetCycle() {
  const active = state.session && ["ready", "recap"].includes(screen);
  modal(
    "Deal this mix again?",
    `<p>This makes previously seen answers in ${active ? "this session’s" : "your selected"} decks available again for “${esc(state.group)}”. Other answers and other groups keep their history.</p>`,
    button("Keep my history", "close-modal", "outline") +
      button("Start new cycle", "confirm-cycle"),
  );
}
function roomOpen() {
  if (!channel) {
    toast(
      "This browser cannot open a synced second display. Use screen mirroring instead.",
    );
    return;
  }
  const u = new URL(location.href);
  u.hash = "";
  u.search = "?display=room";
  const w = window.open(u.href, "headsup-btown-room");
  if (!w) {
    toast("Allow pop-ups to open the room display.");
    return;
  }
  toast(
    "Move the room display to a second screen. Keep it out of the guesser’s view.",
  );
  broadcast();
}
function roomSnapshot() {
  const s = state.session;
  if (!s) return { phase: "idle", group: state.group };
  const r = s.round,
    c = screen === "playing" ? r?.queue[r.index] : null;
  return {
    phase: screen,
    group: s.group,
    player: currentPlayer()?.name,
    turn: s.turn + 1,
    turns: s.schedule.length,
    seconds: r ? E.secondsLeft(r, Date.now()) : playerConfig(s).seconds,
    card: c
      ? {
          t: c.t,
          image: c.image,
          ban:
            effectiveRule(c, playerConfig(s).rule) === "forbidden" ? c.ban : [],
          deckName: c.deckName,
        }
      : null,
    scores: E.scoreboard(
      r && r.phase !== "done"
        ? {
            ...s,
            rounds: [
              ...s.rounds,
              { playerId: currentPlayer().id, score: r.score },
            ],
          }
        : s,
    ),
    total:
      s.rounds.reduce((a, r) => a + r.score, 0) +
      (r && r.phase !== "done" ? r.score : 0),
    target: s.mode === "coop" ? s.config.target : 0,
    rule: RULES[playerConfig(s).rule]?.name,
  };
}
let lastBroadcast = 0;
function broadcast(force = false) {
  if (!channel || isRoom) return;
  const now = Date.now();
  if (!force && now - lastBroadcast < 250) return;
  lastBroadcast = now;
  channel.postMessage({ type: "state", data: roomSnapshot() });
}
function renderRoom(data) {
  if (!data) {
    root.innerHTML = `<main class="room-screen" id="main"><div class="room-wait"><span class="brand-mark">h!</span><h1>The room is ready.</h1><p>Open the game in another tab in this same browser.<br>Your timer, cards, and scoreboard will appear here.</p><p class="small muted">Keep this display behind the guesser. It shows the answer.</p>${button("Full screen", "fullscreen", "outline")}</div></main>`;
    return;
  }
  root.innerHTML = `<main class="room-screen" id="main"><div class="room-top"><span class="brand">heads up, btown!</span><span>${esc(data.group)}</span><div>${button(roomHidden ? "Show answers" : "Hide answers", "room-hide", "outline")}${button(ic("expand") + '<span class="sr-only">Full screen</span>', "fullscreen", "outline")}</div></div><div class="room-content"><div class="eyebrow">${data.player ? `${esc(data.player)} · TURN ${data.turn}/${data.turns}` : "GATHER YOUR PEOPLE"}</div><div class="room-timer">${data.phase === "playing" ? data.seconds : ""}</div>${data.card && !roomHidden ? `${data.card.image ? `<img class="room-photo" src="./${esc(data.card.image)}" alt="${esc(data.card.t)}">` : ""}<h1>${esc(data.card.t)}</h1>${data.card.ban?.length ? `<div class="forbidden"><span>DON'T SAY</span>${data.card.ban.map((x) => `<b>${esc(x)}</b>`).join("")}</div>` : ""}` : `<h1>${data.phase === "paused" ? "Taking a breather." : data.phase === "countdown" ? "Here we go…" : data.phase === "recap" ? "What a round." : data.phase === "finish" ? "That’s a game night." : roomHidden ? "All eyes on the guesser." : "Good company. Great guesses."}</h1>`}<p>${esc(data.rule || "Choose your decks in the game tab.")}</p></div><div class="room-scores">${(data.scores || []).map((p) => `<div><span>${esc(p.name)}</span><b>${p.score}</b></div>`).join("")}</div><p class="room-note">Same-browser room display · Place behind the guesser · No microphone or camera</p></main>`;
}
channel?.addEventListener("message", (e) => {
  if (e.data?.type === "request" && !isRoom) broadcast(true);
  if (e.data?.type === "state" && isRoom) {
    lastRoom = e.data.data;
    renderRoom(lastRoom);
  }
});
async function offline() {
  modal(
    "Ready for spotty bar Wi-Fi.",
    `<p id="offline-message">${offlineStatus === "ready" ? `The game and all ${builtins.length} built-in decks, including the photos, are saved in this browser.` : "Save the game and photo cards in this browser before heading out. Keep this browser’s site data to retain offline access."}</p><p class="small muted">First save is about 22 MB. Offline play needs a successful first visit over HTTPS or localhost. A private hosted link may still need an online sign-in before its cached game can open.</p><p>On your phone, use your browser's Share or menu button, then <b>Add to Home Screen</b> for a more app-like experience.</p>`,
    button("Save / check offline files", "save-offline", "dark"),
  );
}
async function saveOffline() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    toast("Offline saving needs HTTPS or localhost in a supported browser.");
    return;
  }
  offlineStatus = "saving";
  try {
    const reg = await navigator.serviceWorker.register("./sw.js");
    await navigator.serviceWorker.ready;
    const list = await fetch("./offline-files.json").then((r) => r.json());
    const cache = await caches.open("hub-party-content-v1");
    const settled = await Promise.allSettled(
      list.map(async (file) => {
        const url = new URL(file, location.href);
        const response = await fetch(url);
        if (!response.ok || response.redirected)
          throw new Error("Could not save " + file);
        await cache.put(url, response);
      }),
    );
    if (settled.some((x) => x.status === "rejected"))
      throw new Error("Some files could not be saved.");
    await cache.put(
      new URL("./offline-ready", location.href),
      new Response("ready"),
    );
    offlineStatus = "ready";
    const el = document.querySelector("#offline-message");
    if (el)
      el.textContent =
        "Saved. Every built-in deck and photo is ready for offline play on this browser.";
    toast("Game saved for offline play.");
  } catch {
    offlineStatus = "error";
    const el = document.querySelector("#offline-message");
    if (el)
      el.textContent =
        "Some files could not be saved. Stay online and try again before heading out.";
    toast("Offline save incomplete. Stay online and try again.");
  }
}
async function offlineInit() {
  if (!("serviceWorker" in navigator) || !isSecureContext) {
    offlineStatus = "unsupported";
    return;
  }
  try {
    await navigator.serviceWorker.register("./sw.js");
    const c = await caches.open("hub-party-content-v1");
    offlineStatus = (await c.match(new URL("./offline-ready", location.href)))
      ? "ready"
      : "available";
  } catch {
    offlineStatus = "unsupported";
  }
}
function shareRound() {
  const s = state.session,
    r = s.round;
  shareText(
    `${currentPlayer().name} got ${r.score} in Heads Up, Btown!\n${r.results
      .filter((x) => x.verdict === "got")
      .map((x) => "✓ " + x.card.t)
      .join("\n")}\nBest streak: ${r.bestStreak}`,
  );
}
function shareSession() {
  const s = state.session;
  shareText(
    `Heads Up, Btown! — ${s.group}\n${E.scoreboard(s)
      .map((p) => `${p.name}: ${p.score}`)
      .join(
        "\n",
      )}\n${s.rounds.reduce((a, r) => a + r.score, 0)} correct guesses. A very good game night.`,
  );
}
function leave() {
  if (screen === "playing") pause();
  if (screen === "countdown") {
    clearInterval(countdownId);
    countdownId = null;
    detachMotion();
    releaseWake();
  }
  persist();
  goto("library");
}
function toggleDeck(id) {
  if (!deckById(id)) return;
  state.selected = state.selected.includes(id)
    ? state.selected.filter((x) => x !== id)
    : [...state.selected, id];
  persist();
  render();
}
let extending = false;
document.addEventListener("click", async (e) => {
  const home = e.target.closest("[data-home]");
  if (home) {
    e.preventDefault();
    leave();
    return;
  }
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.level) {
    startLevel(b.dataset.level);
    return;
  }
  if (b.dataset.levelReplace) {
    state.session = null;
    closeModal();
    startLevel(b.dataset.levelReplace);
    return;
  }
  if (b.dataset.levelReset) {
    const l = levelById(b.dataset.levelReset);
    if (l) {
      resetMix(state, E.eligibleCards(allDecks(), l.deckIds, l).map(E.cardKey));
      persist();
      closeModal();
      startLevel(l.id);
    }
    return;
  }
  if (b.dataset.toggle) {
    toggleDeck(b.dataset.toggle);
    return;
  }
  if (b.dataset.filter) {
    filter = b.dataset.filter;
    state.filter = filter;
    persist();
    render();
    return;
  }
  if (b.dataset.preview) {
    previewDeck(b.dataset.preview);
    return;
  }
  if (b.dataset.only) {
    state.selected = [b.dataset.only];
    persist();
    closeModal();
    goto("setup");
    return;
  }
  if (b.dataset.modalToggle) {
    toggleDeck(b.dataset.modalToggle);
    previewDeck(b.dataset.modalToggle);
    return;
  }
  if (b.dataset.mode) {
    state.setup.mode = b.dataset.mode;
    if (["teams", "individual"].includes(b.dataset.mode))
      state.setup.streak = false;
    persist();
    render();
    return;
  }
  if (b.dataset.rule) {
    state.setup.rule = b.dataset.rule;
    persist();
    render();
    return;
  }
  if (b.dataset.playerOptions) {
    playerOptions(b.dataset.playerOptions);
    return;
  }
  if (b.dataset.removePlayer) {
    state.setup.players = state.setup.players.filter(
      (x) => x.id !== b.dataset.removePlayer,
    );
    persist();
    render();
    return;
  }
  if (b.dataset.reveal !== undefined) {
    const c = state.session.round.results[+b.dataset.reveal].card;
    b.classList.add("revealed");
    b.innerHTML = `<span>NOW YOU KNOW</span><b>${esc(c.t)}</b><small>${esc(c.deckName)}</small>`;
    return;
  }
  if (b.dataset.photoCredit !== undefined) {
    const c = state.session.round.results[+b.dataset.photoCredit].card;
    modal(
      "Photo credit",
      `<p>${esc(c.t)}</p><p>${esc(c.credit.author)} · ${esc(c.credit.license)}</p><a href="${esc(c.credit.url)}" target="_blank" rel="noopener">Original source ↗</a>`,
    );
    return;
  }
  if (b.dataset.edit) {
    const d = deckById(b.dataset.edit);
    customEdit = d.id;
    customDraft = { name: d.name, text: customText(d) };
    render();
    document.querySelector("#deck-name").focus();
    return;
  }
  if (b.dataset.export) {
    downloadJSON(deckById(b.dataset.export));
    return;
  }
  if (b.dataset.share) {
    shareDeck(b.dataset.share);
    return;
  }
  if (b.dataset.delete) {
    const d = deckById(b.dataset.delete);
    modal(
      "Delete " + d.name + "?",
      `<p>This removes the deck from this browser. Export it first if you want a backup. Your group’s card history is retained.</p>`,
      `<button class="button outline" data-export="${d.id}">Export first</button><button class="button" data-confirm-delete="${d.id}">Delete deck</button>`,
    );
    return;
  }
  if (b.dataset.confirmDelete) {
    state.custom = state.custom.filter((d) => d.id !== b.dataset.confirmDelete);
    state.selected = state.selected.filter(
      (id) => id !== b.dataset.confirmDelete,
    );
    persist();
    closeModal();
    render();
    return;
  }
  const a = b.dataset.action;
  if (!a) return;
  if (a === "levels") {
    goto("levels");
    return;
  }
  if (a === "library") {
    goto("library");
    return;
  }
  if (a === "custom") {
    goto("custom");
    return;
  }
  if (a === "setup" || a === "play") {
    if (extending && state.session) {
      state.session.deckIds = [...state.selected];
      extending = false;
      persist();
      goto("ready");
      return;
    }
    goto("setup");
    return;
  }
  if (a === "locals") {
    filter = "local";
    query = "";
    goto("library");
    document.querySelector(".catalog").scrollIntoView({ behavior: "smooth" });
    return;
  }
  if (a === "close-modal") {
    closeModal();
    return;
  }
  if (a === "help") {
    help();
    return;
  }
  if (a === "settings") {
    settings();
    return;
  }
  if (a === "credits") {
    credits();
    return;
  }
  if (a === "close-settings") {
    detachMotion();
    closeModal();
    persist();
    render();
    return;
  }
  if (a === "test-tilt") {
    await testTilt();
    return;
  }
  if (a === "save-player-options") {
    closeModal();
    persist();
    render();
    return;
  }
  if (a === "add-player") {
    const n = state.setup.players.length;
    if (n < 16)
      state.setup.players.push({
        id: crypto.randomUUID(),
        name: "Player " + (n + 1),
        team: n % 2 ? "B" : "A",
        extra: 0,
        difficulty: "inherit",
      });
    persist();
    render();
    return;
  }
  if (a === "start-session") {
    startSession();
    return;
  }
  if (a === "replace-session") {
    state.session = null;
    closeModal();
    startSession();
    return;
  }
  if (a === "begin-countdown") {
    await beginCountdown();
    return;
  }
  if (a === "cancel-countdown") {
    clearInterval(countdownId);
    countdownId = null;
    detachMotion();
    releaseWake();
    goto("ready");
    return;
  }
  if (a === "got" || a === "pass") {
    mark(a);
    return;
  }
  if (a === "pause") {
    pause();
    return;
  }
  if (a === "resume-round") {
    resumeRound();
    return;
  }
  if (a === "end-round") {
    state.session.round = E.finishRound(
      state.session.round,
      Date.now(),
      "ended",
    );
    finishTurn();
    return;
  }
  if (a === "challenge") {
    pause();
    modal(
      "Make the call together.",
      `<p>Did a clue-giver say part of the answer or break the round’s clue rule?</p><p>A confirmed challenge gives no point and moves to the next card. You can correct it in the round review.</p>`,
      button("Keep playing this card", "resume-round", "outline") +
        button("Rule broken · next card", "confirm-challenge"),
    );
    return;
  }
  if (a === "confirm-challenge") {
    closeModal();
    state.session.round = E.resumeRound(state.session.round, Date.now());
    state.session.round.lastAction = -Infinity;
    screen = "playing";
    mark("challenge");
    if (screen === "playing") {
      startTicker();
      if (state.settings.control === "tilt") attachMotion();
      requestWake();
    }
    return;
  }
  if (a === "next-cluer") {
    clueIndex++;
    render();
    return;
  }
  if (a === "skip-voice") {
    const el = document.querySelector(".voice-prompt b");
    if (el) {
      const index = voices.indexOf(el.textContent);
      el.textContent = voices[(index + 1) % voices.length];
    }
    return;
  }
  if (a === "next-turn") {
    nextTurn();
    return;
  }
  if (a === "final-results") {
    completeSession();
    return;
  }
  if (a === "resume-session") {
    resumeSession();
    return;
  }
  if (a === "save-exit") {
    leave();
    return;
  }
  if (a === "finish-library") {
    state.session = null;
    persist();
    goto("library");
    return;
  }
  if (a === "rematch") {
    const s = state.session;
    state.setup = { ...s.config, players: s.players, teamNames: s.teamNames };
    state.selected = s.deckIds;
    state.session = null;
    persist();
    goto("setup");
    return;
  }
  if (a === "copy-share") {
    const content = pendingShare?.url || pendingShare?.text || "";
    try {
      await navigator.clipboard.writeText(content);
      toast("Copied. Paste it wherever your people are.");
    } catch {
      document.querySelector("#share-content")?.select();
      toast("Select and copy the text above.");
    }
    return;
  }
  if (a === "native-share") {
    try {
      await navigator.share({
        title: "Heads Up, Btown!",
        text: pendingShare.text,
        url: pendingShare.url || undefined,
      });
    } catch (e) {
      if (e.name !== "AbortError")
        toast("Sharing is unavailable here. Copy the text instead.");
    }
    return;
  }
  if (a === "share-round") {
    shareRound();
    return;
  }
  if (a === "share-session") {
    shareSession();
    return;
  }
  if (a === "cancel-edit") {
    customEdit = null;
    customDraft = { name: "", text: "" };
    render();
    return;
  }
  if (a === "reset-cycle") {
    resetCycle();
    return;
  }
  if (a === "confirm-cycle") {
    resetMix(
      state,
      E.uniqueCards(
        allDecks()
          .filter((d) =>
            (state.session && ["ready", "recap"].includes(screen)
              ? state.session.deckIds
              : state.selected
            ).includes(d.id),
          )
          .flatMap((d) => d.cards),
      ).map(E.cardKey),
    );
    persist();
    closeModal();
    render();
    toast("A new card cycle is ready for this mix.");
    return;
  }
  if (a === "extend-mix") {
    if (
      screen === "recap" &&
      state.session.turn + 1 < state.session.schedule.length
    ) {
      state.session.turn++;
      state.session.round = null;
    }
    extending = true;
    state.selected = [...state.session.deckIds];
    closeModal();
    goto("library");
    toast("Add decks, then choose Let’s play to return to your session.");
    return;
  }
  if (a === "room") {
    roomOpen();
    return;
  }
  if (a === "room-hide") {
    roomHidden = !roomHidden;
    renderRoom(lastRoom);
    return;
  }
  if (a === "fullscreen") {
    try {
      if (!document.fullscreenElement)
        await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      toast("Use your browser’s full-screen control.");
    }
    return;
  }
  if (a === "offline") {
    offline();
    return;
  }
  if (a === "save-offline") {
    await saveOffline();
    return;
  }
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "group-name") {
    state.group = el.value.trim() || "The usual crowd";
    persist();
    return;
  }
  if (el.id === "search") {
    query = el.value;
    document.querySelector("#deck-grid").innerHTML = cardsHTML();
    return;
  }
  if (el.id === "deck-name") {
    customDraft.name = el.value;
    return;
  }
  if (el.id === "deck-text") {
    customDraft.text = el.value;
    return;
  }
  if (el.dataset.playerName) {
    const p = state.setup.players.find((p) => p.id === el.dataset.playerName);
    if (p) p.name = el.value;
    persist();
    return;
  }
  if (el.dataset.teamName !== undefined) {
    state.setup.teamNames[+el.dataset.teamName] = el.value;
    persist();
    return;
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "group-name") {
    state.group = el.value.trim() || "The usual crowd";
    persist();
    render();
    return;
  }
  if (
    ["seconds", "rounds", "passLimit", "passPenalty", "target"].includes(el.id)
  ) {
    state.setup[el.id] = +el.value;
    persist();
    render();
    return;
  }
  if (el.id === "difficulty") {
    state.setup.difficulty = el.value;
    persist();
    render();
    return;
  }
  if (["streak", "lightning"].includes(el.id)) {
    state.setup[el.id] = el.checked;
    persist();
    return;
  }
  if (["sound", "haptics"].includes(el.id)) {
    state.settings[el.id] = el.checked;
    persist();
    if (el.id === "sound" && el.checked) {
      enableAudio();
      sound("got");
    }
    return;
  }
  if (["control", "sensitivity"].includes(el.id)) {
    state.settings[el.id] = el.value;
    persist();
    return;
  }
  if (el.dataset.playerTeam) {
    state.setup.players.find((p) => p.id === el.dataset.playerTeam).team =
      el.value;
    persist();
    return;
  }
  if (el.dataset.extra) {
    state.setup.players.find((p) => p.id === el.dataset.extra).extra =
      +el.value;
    persist();
    return;
  }
  if (el.dataset.personalDifficulty) {
    state.setup.players.find(
      (p) => p.id === el.dataset.personalDifficulty,
    ).difficulty = el.value;
    persist();
    return;
  }
  if (el.dataset.correct !== undefined) {
    const s = state.session;
    s.round = E.correctResult(s.round, +el.dataset.correct, el.value);
    const summary = s.rounds.find((r) => r.turn === s.turn);
    summary.results = s.round.results;
    summary.score = s.round.score;
    persist();
    render();
    const details = document.querySelector(".round-details");
    if (details) details.open = true;
    broadcast(true);
    return;
  }
  if (el.id === "import-file") {
    importFile(el.files[0]);
    return;
  }
});
document.addEventListener("submit", (e) => {
  if (e.target.id === "custom-form") {
    e.preventDefault();
    saveCustom();
  }
});
document.addEventListener("keydown", (e) => {
  if (
    e.repeat ||
    document.querySelector("#modal").open ||
    /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
  )
    return;
  if (screen === "playing") {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      mark("got");
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      mark("pass");
    }
    if (e.code === "Space" || e.key === "Escape") {
      e.preventDefault();
      pause();
    }
    if (e.key === "n" && playerConfig(state.session).rule === "one") {
      clueIndex++;
      render();
    }
  } else if (screen === "paused" && e.code === "Space") {
    e.preventDefault();
    resumeRound();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (screen === "playing") pause();
    if (screen === "countdown") {
      clearInterval(countdownId);
      countdownId = null;
      detachMotion();
      releaseWake();
      goto("ready");
    }
  }
});
document.querySelector("#modal").addEventListener("close", () => {
  if (calibrating) detachMotion();
});
window.addEventListener("pagehide", () => {
  if (isRoom) return;
  if (screen === "playing")
    state.session.round = E.pauseRound(state.session.round, Date.now());
  persist();
  detachMotion();
  releaseWake();
});
window.addEventListener("hashchange", () => {
  if (!isRoom) importShared();
});
if (!isRoom) {
  render();
  importShared();
  offlineInit();
} else {
  renderRoom(null);
  channel?.postMessage({ type: "request" });
  setInterval(() => channel?.postMessage({ type: "request" }), 1500);
}
// Optional, feature-detected WebMCP interface uses the same live state as the UI.
const modelContext = document.modelContext;
if (modelContext?.registerTool && !isRoom) {
  const lifecycle = new AbortController();
  const register = (t) => {
    try {
      Promise.resolve(
        modelContext.registerTool(t, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {}
  };
  register({
    name: "list_game_decks",
    title: "Browse game decks",
    description:
      "List the playable decks, card counts, and fresh-answer counts for the current device-local group.",
    inputSchema: {
      type: "object",
      properties: {
        group: {
          type: "string",
          enum: ["all", "local", "party", "pop", "family", "custom"],
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: (input) => {
      if (
        input?.group &&
        !["all", "local", "party", "pop", "family", "custom"].includes(
          input.group,
        )
      )
        throw new Error("Unknown deck group");
      return allDecks()
        .filter(
          (d) =>
            !input?.group || input.group === "all" || d.group === input.group,
        )
        .map((d) => ({
          id: d.id,
          name: d.name,
          cards: d.cards.length,
          fresh: d.cards.filter((c) => !Object.hasOwn(seen(), E.cardKey(c)))
            .length,
        }));
    },
  });
  register({
    name: "configure_deck_mix",
    title: "Choose game decks",
    description:
      "Replace the selected deck mix and open setup. Does not start a session or a round.",
    inputSchema: {
      type: "object",
      properties: {
        deckIds: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 50,
        },
      },
      required: ["deckIds"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute: (input) => {
      if (
        !Array.isArray(input?.deckIds) ||
        !input.deckIds.length ||
        input.deckIds.some((id) => !deckById(id))
      )
        throw new Error("Choose existing deck IDs");
      if (state.session) throw new Error("Finish the current session first");
      state.selected = [...new Set(input.deckIds)];
      persist();
      goto("setup");
      return { screen, selected: state.selected, fresh: fresh().length };
    },
  });
  window.addEventListener("pagehide", () => lifecycle.abort(), { once: true });
}
