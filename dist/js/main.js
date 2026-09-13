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
  filter = ["all", "local", "party", "pop", "family"].includes(state.filter) ? state.filter : "all",
  query = "",
  activeChapter = null,
  editorOpen = false,
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
    hint: "One clue per person, clockwise. Use Next / skip to keep it moving.",
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
  return `<header class="site-header"><a class="brand" href="./" data-home="true"><span class="brand-mark">${ic("cards")}</span>Heads Up<span class="brand-place">Btown</span></a><button class="icon-button" aria-label="Settings" data-action="settings">${ic("settings")}</button></header>`;
}
function nav() {
  return `<nav class="nav" aria-label="Game sections">${[
    ["library", "cards", "Decks"], ["levels", "trophy", "Challenges"], ["custom", "edit", "My Decks"],
  ].map(([s, i, label]) => `<button class="${screen === s ? "active" : ""}" data-action="${s}" ${screen === s ? 'aria-current="page"' : ""}>${ic(i)}<span>${label}</span></button>`).join("")}</nav>`;
}
function render() {
  const active = document.activeElement;
  const focusSelector = !document.querySelector("#modal").open && active?.closest("#app")
    ? active.id ? "#" + CSS.escape(active.id)
    : active.dataset.toggle ? `[data-toggle="${CSS.escape(active.dataset.toggle)}"]`
    : active.dataset.filter ? `[data-filter="${CSS.escape(active.dataset.filter)}"]` : null
    : null;
  const openDetails = [...document.querySelectorAll("details[open]")].map(el => el.className).filter(Boolean);
  const inRound = ["ready", "countdown", "playing", "paused"].includes(screen);
  document.body.classList.toggle("in-round", inRound);
  document.body.classList.toggle("room-mode", isRoom);
  document.body.dataset.screen = screen;
  if (isRoom) { renderRoom(lastRoom); return; }
  if (inRound) { root.innerHTML = roundView(); return; }
  const showNav = ["library", "custom", "levels"].includes(screen);
  root.innerHTML = header() + `<main class="shell ${showNav ? 'has-tabs' : ''}" id="main" tabindex="-1">${screen === "levels" ? levelsView() : screen === "library" ? library() : screen === "setup" ? setupView() : screen === "custom" ? customView() : screen === "recap" ? recapView() : finishView()}</main>${showNav ? nav() : ""}`;
  for (const name of openDetails) {
    const el = document.getElementsByClassName(name)[0];
    if (el?.tagName === "DETAILS") el.open = true;
  }
  if (focusSelector) document.querySelector(focusSelector)?.focus({preventScroll:true});
  broadcast();
}
function goto(s) {
  screen = s;
  render();
  window.scrollTo(0, 0);
  document.querySelector("#main")?.focus({preventScroll:true});
}
function library() {
  return `<section class="page-heading"><div><h1>Decks</h1><p>Pick one. Or mix a few.</p></div><span class="quiet-count">${builtins.filter(d => d.group !== "local").length} general · ${builtins.filter(d => d.group === "local").length} local</span></section>${state.session && !state.session.finished ? `<button class="resume-banner" data-action="resume-session">${ic("play")}<span><b>Continue your game</b><small>${esc(state.session.group)} · Turn ${state.session.turn + 1} of ${state.session.schedule.length}</small></span>${ic("chevron")}</button>` : ""}<section class="catalog" aria-label="Choose decks"><label class="searchbox">${ic("search")}<input type="search" id="search" aria-label="Search decks" placeholder="Search decks or answers" value="${esc(query)}"></label><div class="filter-row" aria-label="Deck categories">${[
    ["all", "All"], ["party", "Party"], ["pop", "Pop culture"], ["family", "Family"], ["local", "Local"],
  ].map(([id,label]) => `<button class="chip ${filter === id ? 'active' : ''}" aria-pressed="${filter === id}" data-filter="${id}">${label}</button>`).join("")}</div><div class="deck-grid" id="deck-grid">${cardsHTML()}</div></section>${selectionPanel()}`;
}
function cardsHTML() {
  return allDecks().filter(d => (filter === "all" || d.group === filter) && (!query || `${d.name} ${d.blurb} ${d.cards.map(c => c.t).join(" ")}`.toLowerCase().includes(query.toLowerCase()))).map(d => {
    const selected = state.selected.includes(d.id);
    return `<article class="deck-card ${selected ? 'selected' : ''}" style="--cover:${d.color}"><button class="deck-select" data-toggle="${d.id}" aria-pressed="${selected}" aria-label="${selected ? 'Remove' : 'Add'} ${esc(d.name)}"><span class="deck-cover">${d.cover ? `<img src="./${d.cover}" alt="" loading="lazy" width="300" height="170">` : `<span class="deck-emoji" aria-hidden="true">${d.emoji}</span>`}<span class="selection-check">${ic(selected ? "check" : "plus")}</span>${d.group === 'local' ? '<span class="local-label">LOCAL</span>' : ''}</span><span class="deck-info"><span class="deck-title">${esc(d.name)}</span><span class="deck-meta">${d.cards.length} ${d.photo ? 'photo cards' : 'cards'}</span></span></button><button class="deck-detail" data-preview="${d.id}" aria-label="Preview ${esc(d.name)}">${ic("info")}</button></article>`;
  }).join("") || '<div class="empty"><h2>No decks found</h2><p>Try another search or category.</p></div>';
}
function selectionPanel() {
  const selected = state.selected.map(deckById).filter(Boolean);
  return `<aside class="play-dock" aria-label="Your selected decks"><div class="play-dock-inner"><button class="mix-summary" data-action="selected-decks" ${selected.length ? '' : 'disabled'}><span class="mini-deck-stack">${ic("cards")}</span><span><b>${selected.length ? `${selected.length} deck${selected.length === 1 ? '' : 's'} selected` : 'Choose a deck'}</b><small>${selected.length ? 'View your mix' : 'Tap a card to add it'}</small></span>${selected.length ? ic("chevron") : ''}</button><button class="button" data-action="play" ${selected.length ? '' : 'disabled'}>Play ${ic("play")}</button></div></aside>`;
}
function selectedDecks() {
  const decks = state.selected.map(deckById).filter(Boolean);
  modal("Your mix", `<div class="grouped-list">${decks.map(d => `<div class="mix-row"><span class="row-emoji" style="--cover:${d.color}">${d.emoji}</span><button class="row-copy" data-preview="${d.id}"><b>${esc(d.name)}</b><small>${d.cards.length} cards</small></button><button class="icon-button" data-mix-remove="${d.id}" aria-label="Remove ${esc(d.name)}">${ic("minus")}</button></div>`).join("") || '<p class="empty">Choose a deck to get started.</p>'}</div><p class="footnote">Answers are remembered for ${esc(state.group)}. No repeats until you choose a new cycle.</p>`,button("Done", "close-modal"));
}
function previewDeck(id) {
  const d = deckById(id);
  if (!d) return;
  const n = E.uniqueCards(d.cards).filter(c => !Object.hasOwn(seen(), E.cardKey(c))).length;
  modal(d.name, `<div class="preview-cover" style="--cover:${d.color}">${d.cover ? `<img src="./${d.cover}" alt="">` : d.emoji}</div><p>${esc(d.blurb)}</p><p class="footnote">${d.cards.length} cards · ${n} fresh for ${esc(state.group)}</p>${d.rule ? `<p class="callout">${esc(RULES[d.rule].hint)}</p>` : ''}<details class="preview-examples"><summary>Preview answers ${ic("chevron")}</summary><div class="sample-cards">${d.cards.slice(0,6).map(c => `<span>${esc(c.t)}</span>`).join("")}</div><p class="footnote">Previewing doesn't mark these cards as played.</p></details>`, `<button class="button" data-only="${d.id}">Play this deck</button><button class="button secondary" data-modal-toggle="${d.id}">${state.selected.includes(id) ? 'Remove from mix' : 'Add to mix'}</button>`);
}
function groupField() {
  return `<label class="field"><span>Group name</span><input id="group-name" value="${esc(state.group)}" maxlength="40" list="group-names" placeholder="The usual crowd"></label><datalist id="group-names">${Object.values(state.groups).map(g => `<option value="${esc(g.name)}"></option>`).join("")}</datalist><p class="footnote">Each group keeps its own card history and challenge progress on this device.</p>`;
}
function playersFields() {
  const s = state.setup;
  return `${s.mode === 'teams' ? `<div class="two-fields">${s.teamNames.map((name,i) => `<label class="field"><span>Team ${i ? 'B' : 'A'}</span><input data-team-name="${i}" value="${esc(name)}" maxlength="28"></label>`).join("")}</div>` : ''}<div class="players-list">${(s.mode === 'quick' ? s.players.slice(0,1) : s.players).map((p,i) => `<div class="player-line"><span class="avatar ${p.team === 'B' ? 'alternate' : ''}">${i+1}</span><label class="player-name"><span class="sr-only">Player ${i+1} name</span><input data-player-name="${p.id}" value="${esc(p.name)}" maxlength="25" placeholder="Player ${i+1}"></label>${s.mode === 'teams' ? `<select aria-label="Team for player ${i+1}" data-player-team="${p.id}">${option('A','A',p.team)}${option('B','B',p.team)}</select>` : ''}<button class="icon-button" data-player-options="${p.id}" aria-label="Adjustments for player ${i+1}">${ic('settings')}</button>${s.mode !== 'quick' && s.players.length > 2 ? `<button class="icon-button" data-remove-player="${p.id}" aria-label="Remove player ${i+1}">${ic('minus')}</button>` : ''}${p.extra || p.difficulty !== 'inherit' ? `<small class="player-adjustment">${p.extra ? `+${p.extra}s` : ''} ${p.difficulty !== 'inherit' ? ['', 'Easy', 'Medium', 'Hard'][+p.difficulty] : ''}</small>` : ''}</div>`).join("")}</div>${s.mode !== 'quick' ? `<button class="text-button add-person" data-action="add-player" ${s.players.length >= 16 ? 'disabled' : ''}>${ic('plus')} Add player</button>` : ''}`;
}
function setupView() {
  const s = state.setup, n = fresh().length;
  const selected = state.selected.map(deckById).filter(Boolean);
  return `<div class="compact-page"><button class="back-button" data-action="library">${ic('back')} Decks</button><section class="page-heading"><div><h1>New game</h1><p>${selected.length} deck${selected.length === 1 ? '' : 's'} · <span id="fresh-count">${n.toLocaleString()}</span> fresh answers</p></div></section><div class="grouped-list setup-basics"><label class="setting-row"><span>Game</span><select id="mode">${[['quick','Quick play'],['individual','Take turns'],['teams','Teams'],['coop','Co-op']].map(([id,label]) => option(id,label,s.mode)).join('')}</select></label><label class="setting-row"><span>Round length</span><select id="seconds">${[30,60,90,120].map(v => option(v,`${v} seconds`,s.seconds)).join('')}</select></label><label class="setting-row"><span>Clue style</span><select id="rule">${Object.entries(RULES).map(([id,r]) => option(id,r.name,s.rule)).join('')}</select></label>${s.mode !== 'quick' ? `<label class="setting-row"><span>${s.mode === 'teams' ? 'Laps per team' : 'Turns per player'}</span><select id="rounds">${[1,2,3,4,5].map(v => option(v,v,s.rounds)).join('')}</select></label>` : ''}${s.mode === 'coop' ? `<label class="setting-row"><span>Shared target</span><select id="target">${[10,20,30,40,50,60,75,100].map(v => option(v,`${v} correct`,s.target)).join('')}</select></label>` : ''}</div><p class="footnote rule-explanation">${esc(RULES[s.rule].hint)}</p>${s.rule === 'forbidden' || s.rule === 'hum' ? `<p class="callout">${s.rule === 'forbidden' ? `${available().length} answers in your mix have forbidden clues.` : 'This style uses song cards. Include the Hum along deck.'}</p>` : ''}${s.mode === 'quick' ? `<details class="players-options disclosure"><summary>Players & group ${ic('chevron')}</summary><div class="disclosure-body">${playersFields()}${groupField()}</div></details>` : `<section class="players-section"><h2>Players</h2>${playersFields()}<p class="footnote">${s.mode === 'teams' ? 'Teams alternate and get equal turns.' : s.mode === 'coop' ? 'Every correct answer counts toward the shared target.' : 'Pass the phone between turns. Scores stay together.'}</p><details class="group-options disclosure"><summary>Group & card history ${ic('chevron')}</summary><div class="disclosure-body">${groupField()}</div></details></section>`}<details class="game-options disclosure"><summary>More options ${ic('chevron')}</summary><div class="disclosure-body"><div class="grouped-list"><label class="setting-row"><span>Difficulty</span><select id="difficulty">${[['familiar','Familiar'],['mixed','All cards'],['1','Easy'],['2','Medium'],['3','Hard'],['ramp','Easy to hard']].map(([v,l]) => option(v,l,s.difficulty)).join('')}</select></label><label class="setting-row"><span>Controls</span><select id="control">${option('tap','Tap / keyboard',state.settings.control)}${option('tilt','Tilt + tap',state.settings.control)}</select></label><label class="setting-row"><span>Pass limit</span><select id="passLimit">${[0,3,5,10].map(v => option(v,v ? `${v} passes` : 'Unlimited',s.passLimit)).join('')}</select></label><label class="setting-row"><span>Pass penalty</span><select id="passPenalty">${[0,2,3,5].map(v => option(v,v ? `${v} seconds` : 'None',s.passPenalty)).join('')}</select></label></div>${['teams','individual'].includes(s.mode) ? `<label class="switch-row"><span><b>Lightning finish</b><small>30 seconds each on the last lap.</small></span><input type="checkbox" id="lightning" ${s.lightning ? 'checked' : ''}></label>` : `<label class="switch-row"><span><b>Streak bonus</b><small>+2 seconds from the third correct answer. Up to +10 per round.</small></span><input type="checkbox" id="streak" ${s.streak ? 'checked' : ''}></label>`}<button class="row-button" data-action="room">${ic('screen')}<span>Open room display<small>A second screen in this browser.</small></span>${ic('chevron')}</button></div></details><div id="setup-error" role="alert"></div><div class="setup-start">${s.difficulty === "familiar" ? '<p class="footnote">Familiar cards. Deep cuts are off.</p>' : ""}<button class="button full" data-action="start-session" ${selected.length ? '' : 'disabled'}>Start game ${ic('play')}</button><p class="footnote">Phone to your forehead. Friends give the clues.</p></div></div>`;
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
  const s = state.session, p = currentPlayer();
  if (!s || !p) return '';
  const cfg = playerConfig(s), r = s.round, rule = RULES[cfg.rule], total = s.schedule.length;
  const turn = total > 1 ? `Turn ${s.turn+1} of ${total}` : '';
  const team = s.mode === 'teams' ? s.teamNames[p.team === 'A' ? 0 : 1] : '';
  if (screen === 'ready') return `<main id="main" class="ready-screen"><div class="play-topbar"><button class="text-button" data-action="save-exit">${ic('back')} Save & leave</button><span>${turn}</span><button class="icon-button" aria-label="Game settings" data-action="settings">${ic('settings')}</button></div><div class="ready-content"><div class="ready-phone">${ic('phone')}</div><h1>${esc(p.name)}, you're up.</h1><p class="ready-direction">Phone to your forehead.<br>${team ? `${esc(team)} gives the clues.` : 'Your friends give the clues.'}</p>${s.levelId ? `<p class="level-ready-target">${esc(levelById(s.levelId).name)}<span>★ ${levelById(s.levelId).targets[0]} · ★★ ${levelById(s.levelId).targets[1]} · ★★★ ${levelById(s.levelId).targets[2]} correct</span></p>` : ''}<div class="instruction-card"><div class="ready-facts"><b>${rule.name}</b><span>${cfg.seconds} seconds${s.config.lightning && s.schedule[s.turn].lap === s.config.rounds-1 ? ' · Lightning' : ''}</span></div><p>${esc(rule.hint)}</p>${s.deckIds.some(id => deckById(id)?.rule) ? '<small>Acting and humming decks keep their own clue style.</small>' : ''}</div><button class="button full" data-action="begin-countdown">I'm ready</button><p class="footnote">${state.settings.control === 'tilt' ? 'Tilt down for correct, up to pass. Return upright.' : 'A clue-giver taps. Same idea counts.'}</p></div></main>`;
  if (screen === 'countdown') return `<main class="countdown-screen" id="main"><button class="text-button countdown-cancel" data-action="cancel-countdown">${ic('close')} Cancel</button><div><p>Screen toward your friends</p><div class="countdown-number" id="countdown-number">${Math.max(1,Math.ceil((countdownUntil-Date.now())/1000))}</div></div></main>`;
  if (screen === 'paused') return `<main class="pause-screen" id="main"><div><span class="pause-symbol">${ic('pause')}</span><h1>Paused</h1><p>${E.secondsLeft(r,Date.now())} seconds left · ${r.score} correct</p><div class="pause-actions">${button('Resume','resume-round')}${button('Save & leave','save-exit','secondary')}<details class="pause-more disclosure"><summary>More ${ic('chevron')}</summary><div class="disclosure-body">${button('Challenge a clue','challenge','outline full')}${button('End round','end-round','outline full')}</div></details></div></div></main>`;
  const card = r.queue[r.index], liveRule = effectiveRule(card,cfg.rule);
  const cluer = clueGivers()[clueIndex % Math.max(1,clueGivers().length)], voice = voices[(r.index+s.turn)%voices.length];
  return `<main class="play-screen" id="main"><div class="play-topbar"><span><b>${esc(p.name)}</b>${team ? ` · ${esc(team)}` : ''}</span><span class="round-rule">${RULES[liveRule].name}</span><button class="icon-button" aria-label="Pause round" data-action="pause">${ic('pause')}</button></div><div class="time-track"><div id="time-bar" style="width:${Math.min(100,E.secondsLeft(r,Date.now())/r.baseSeconds*100)}%"></div></div><div class="game-hud"><span class="score-pill"><b id="round-score">${r.score}</b> correct</span><div class="timer" id="game-timer" aria-label="Seconds remaining">${E.secondsLeft(r,Date.now())}</div><span class="streak-pill">${r.streak >= 3 ? `${r.streak} in a row` : ''}${r.bonus ? ` · +${r.bonus}s` : ''}</span></div><div class="answer-stage ${card.image ? 'photo-stage' : ''}"><div class="card-category">${esc(card.deckName)}</div>${card.image ? `<img class="photo-prompt" src="./${card.image}" alt="Photo clue: ${esc(card.t)}">` : ''}<h1 class="answer ${card.t.length > 44 ? 'answer-long' : ''}" id="answer">${esc(card.t)}</h1>${liveRule === 'forbidden' ? `<div class="forbidden"><span>Don't say</span>${card.ban.map(w => `<b>${esc(w)}</b>`).join('')}</div>` : ''}${liveRule === 'one' ? `<div class="clue-rotation"><span>One clue from <b>${esc(cluer?.name || 'the next person')}</b></span><button data-action="next-cluer" aria-label="Next clue-giver or skip me">Next / skip ${ic('chevron')}</button></div>` : ''}${liveRule === 'accent' ? `<div class="voice-prompt"><span>Voice: <b>${esc(voice)}</b></span><button class="text-button" data-action="skip-voice">Change</button></div>` : ''}${['act','hum','word'].includes(liveRule) ? `<p class="live-rule-note">${esc(RULES[liveRule].hint)}</p>` : ''}</div><div class="game-actions"><button class="pass-button" data-action="pass" ${r.options.passLimit && r.passes >= r.options.passLimit ? 'disabled' : ''}>${ic('arrow')}<b>Pass</b>${r.options.passLimit || r.options.passPenalty ? `<small>${r.options.passLimit ? `${Math.max(0,r.options.passLimit-r.passes)} left` : ''}${r.options.passPenalty ? ` · −${r.options.passPenalty}s` : ''}</small>` : ''}</button><button class="got-button" data-action="got">${ic('check')}<b>Correct</b></button></div><div class="game-foot">${state.settings.control === 'tilt' ? 'Tilt down: correct · Tilt up: pass' : '<span class="keyboard-hint">← Pass · → Correct · Space to pause</span>'}</div><div class="score-flash" id="score-flash" aria-live="polite"></div></main>`;
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
  const s = state.session, r = s.round, p = currentPlayer(), missed = r.results.filter(x => x.verdict !== 'got'), isLast = s.turn+1 >= s.schedule.length;
  const quick = s.mode === 'quick' && !s.levelId, total = s.rounds.reduce((a,r) => a+r.score,0);
  return `<div class="recap-page"><section class="page-heading"><div><h1>Round complete</h1><p>${esc(p.name)}${s.schedule.length > 1 ? ` · Turn ${s.turn+1} of ${s.schedule.length}` : ''}</p></div><button class="icon-button" data-action="share-round" aria-label="Share this round">${ic('share')}</button></section><div class="result-stats"><div><b>${r.score}</b><span>Correct</span></div><div><b>${r.results.filter(x => x.verdict === 'pass').length}</b><span>Passed</span></div><div><b>${r.bestStreak}</b><span>Best streak</span></div></div>${r.reason === 'exhausted' ? '<p class="callout">All fresh cards played. Add more decks or choose a new card cycle.</p>' : ''}${r.bonus ? `<p class="footnote">Streak bonus: +${r.bonus} seconds.</p>` : ''}${missed.length ? `<section class="reveal-section"><h2>The ones you missed</h2><div class="reveal-grid">${missed.map(x => `<button class="reveal-card" data-reveal="${r.results.indexOf(x)}"><span>${x.verdict === 'challenge' ? 'Challenged' : x.verdict === 'unanswered' ? 'Unanswered' : 'Passed'}</span><b>Reveal ${ic('chevron')}</b></button>`).join('')}</div></section>` : '<p class="perfect-note">Every card answered. Nicely done.</p>'}<details class="round-details"><summary>Review answers <span>${r.results.length} ${r.results.length === 1 ? 'card' : 'cards'}</span>${ic('chevron')}</summary><p class="footnote">Settle close calls here. Corrections update the score.</p><div class="result-list">${r.results.map((x,i) => `<div class="result-line"><span>${esc(x.card.t)}${x.card.credit ? `<button class="text-button" data-photo-credit="${i}" aria-label="Photo credit for ${esc(x.card.t)}">${ic('info')}</button>` : ''}</span><select aria-label="Result for ${esc(x.card.t)}" data-correct="${i}">${[['got','Correct'],['pass','Passed'],['challenge','Rule broken'],['unanswered','Unanswered']].map(([v,l]) => option(v,l,x.verdict)).join('')}</select></div>`).join('')}</div></details>${s.mode === 'coop' ? `<section class="recap-scoreboard"><h2>Team total <span>${total} / ${s.config.target}</span></h2><progress value="${total}" max="${s.config.target}" aria-label="Progress toward shared target"></progress></section>` : s.mode !== 'quick' ? `<section class="recap-scoreboard"><h2>Scoreboard</h2>${scoreRows(s)}</section>` : ''}<div class="recap-actions">${button(quick ? 'Play again' : isLast ? (s.levelId ? 'See stars' : 'Final scores') : 'Next player',quick ? 'quick-replay' : isLast ? 'final-results' : 'next-turn','full')}${button(quick ? 'Done' : 'Save & leave',quick ? 'quick-done' : 'save-exit','text-only')}${!isLast && r.reason === 'exhausted' ? button('Add decks','extend-mix','secondary full') : ''}</div></div>`;
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
  return `<section class="final-screen"><div class="final-medallion">${s.mode === "coop" ? "💚" : "🏆"}</div><h1>${s.mode === "quick" ? "Game complete" : s.mode === "coop" ? (won ? "Target reached" : "Game complete") : winners.length > 1 ? "It’s a tie" : esc(winners[0].name) + " wins"}</h1><p class="muted">${s.mode === "coop" ? `${total} correct ${total === 1 ? "answer" : "answers"}. A target of ${s.config.target}. ` : `${total} correct ${total === 1 ? "guess" : "guesses"} across ${s.rounds.length} ${s.rounds.length === 1 ? "round" : "rounds"}. `}</p>${s.mode === "coop" ? `<div class="final-coop"><progress value="${total}" max="${s.config.target}" aria-label="Progress toward shared target"></progress></div>` : `<div class="final-scoreboard">${scoreRows(s)}</div>`}<div class="final-buttons">${button("Play again", "rematch", "dark")}${button("Done", "finish-library", "outline")}${button("Share results", "share-session", "outline")}</div><p class="small muted">Your card history stays with “${esc(s.group)}”. No repeat answers until you choose a new cycle.</p></section>`;
}

function groupProgress(group = state.group) {
  state.progress ||= {};
  const key = "group:" + group.trim().toLowerCase();
  if (!Object.hasOwn(state.progress, key)) state.progress[key] = {};
  return state.progress[key];
}
function levelsView() {
  const progress = groupProgress(), stars = levels.reduce((n,l) => n + (progress[l.id]?.stars || 0),0);
  const ch = chapters.find(c => c.id === activeChapter);
  if (ch) return `<div class="compact-page"><button class="back-button" data-action="all-challenges">${ic('back')} Challenges</button><section class="page-heading"><div><h1>${esc(ch.name)}</h1><p>Earn a star to unlock the next level.</p></div></section><div class="grouped-list level-list">${levels.filter(l => l.chapter === ch.id).map(l => {
    const p = progress[l.id] || {}, unlocked = isUnlocked(l,progress);
    return `<button class="level-row ${unlocked ? '' : 'locked'}" data-level="${l.id}" ${unlocked ? '' : 'disabled'} aria-label="${esc(l.name)}${unlocked ? '' : ', locked. Complete the previous level.'}"><span class="level-number">${String(l.number).padStart(2,'0')}</span><span class="row-copy"><b>${esc(l.name)}</b><small>${RULES[l.rule].name} · ${l.seconds}s${p.attempts ? ` · Best ${p.best}` : ''}</small></span><span class="level-stars" aria-label="${p.stars || 0} of 3 stars">${unlocked ? '★'.repeat(p.stars || 0) + '☆'.repeat(3-(p.stars || 0)) : ic('lock')}</span>${unlocked ? ic('chevron') : ''}</button>`;
  }).join('')}</div><p class="footnote">Each level has fixed settings. Your group's no-repeat history still applies.</p></div>`;
  return `<section class="page-heading"><div><h1>Challenges</h1><p>Six paths. Thirty-six reasons to play.</p></div></section><div class="progress-summary"><span>${ic('star')} <b>${stars}</b><span class="muted"> / 108 stars</span></span><button class="text-button" data-action="edit-group">${esc(state.group)} ${ic('chevron')}</button></div><div class="chapter-grid">${chapters.map((ch,i) => {
    const list = levels.filter(l => l.chapter === ch.id), earned = list.reduce((n,l) => n+(progress[l.id]?.stars || 0),0);
    return `<button class="chapter-card" data-chapter="${ch.id}" style="--chapter-color:${['#e8edff','#e3f2e9','#f8e6f0','#f5eadc','#e5eef8','#eeebfa'][i]}"><span class="chapter-art">${ch.emoji}</span><span class="row-copy"><b>${esc(ch.name)}</b><small>${earned} of 18 stars</small></span>${ic('chevron')}<span class="chapter-progress"><span style="width:${earned/18*100}%"></span></span></button>`;
  }).join('')}</div>`;
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
      button("Challenges", "close-modal", "outline") +
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
  const l = levelById(s.levelId), score = s.rounds.reduce((n,r) => n+r.score,0), stars = starsFor(l,score);
  const next = levels.find(x => x.chapter === l.chapter && x.index === l.index+1);
  const canContinue = next && isUnlocked(next,groupProgress(s.group));
  const award = s.levelAward || groupProgress(s.group)[l.id] || {};
  return `<section class="final-screen"><div class="level-award" aria-label="${stars} of 3 stars">${"★".repeat(stars)}${"☆".repeat(3-stars)}</div><h1>${stars ? "Level complete" : "Keep going"}</h1><p class="muted">${esc(l.name)} · ${score} correct</p><p class="small muted">${stars ? `${stars} ${stars === 1 ? "star" : "stars"} earned` : `${l.targets[0]} correct earns your first star`} · Best ${award.best || score}</p><div class="final-buttons">${canContinue ? `<button class="button" data-level="${next.id}">Next level</button>` : ""}<button class="button ${canContinue ? "secondary" : ""}" data-level="${l.id}">Try again</button>${button("Challenges","levels","text-only")}</div><button class="text-button" data-action="share-round">${ic("share")} Share result</button></section>`;
}

function customView() {
  if (editorOpen) return `<div class="compact-page"><button class="back-button" data-action="cancel-edit">${ic('back')} My Decks</button><section class="page-heading"><div><h1>${customEdit ? 'Edit deck' : 'New deck'}</h1></div></section><form id="custom-form" class="custom-editor"><label class="field"><span>Name</span><input id="deck-name" maxlength="48" required placeholder="The group chat" value="${esc(customDraft.name)}"></label><label class="field"><span>Cards</span><textarea id="deck-text" rows="9" required placeholder="One answer per line&#10;Dad’s famous pancakes&#10;That camping trip&#10;The office coffee machine">${esc(customDraft.text)}</textarea><small>5–500 answers. One per line.</small></label><details class="custom-format disclosure"><summary>Difficulty & forbidden clues ${ic('chevron')}</summary><div class="disclosure-body"><p class="footnote">Optional: answer | difficulty | three forbidden clues</p><code class="format-example">Titanic | easy | ship, iceberg, movie</code><p class="footnote">Use easy, medium, or hard. Cards without a difficulty use Medium.</p></div></details><div id="custom-error" role="alert"></div><div class="custom-actions"><button class="button full" type="submit">${customEdit ? 'Save changes' : 'Save deck'}</button><label class="text-button file-label">${ic('download')} Import text or JSON<input type="file" id="import-file" accept=".txt,.json,text/plain,application/json" class="sr-only"></label></div></form></div>`;
  return `<section class="page-heading"><div><h1>My Decks</h1><p>Your people. Your inside jokes.</p></div>${state.custom.length ? `<button class="icon-button accent" data-action="new-deck" aria-label="Create a deck">${ic('plus')}</button>` : ''}</section>${state.custom.length ? `<div class="grouped-list saved-decks">${state.custom.map(d => `<button class="saved-deck" data-manage="${d.id}"><span class="row-emoji">${d.emoji}</span><span class="row-copy"><b>${esc(d.name)}</b><small>${d.cards.length} cards</small></span>${ic('chevron')}</button>`).join('')}</div><p class="footnote">Saved on this device. Open a deck to play, edit, or share it.</p>` : `<section class="empty custom-empty"><span class="empty-symbol">${ic('cards')}</span><h2>Make it personal.</h2><p>Turn familiar faces and favorite stories<br>into your next great game.</p>${button('Create a deck','new-deck')}</section>`}`;
}
function manageDeck(id) {
  const d = deckById(id);
  if (!d) return;
  modal(d.name, `<p class="footnote">${d.cards.length} cards · Saved on this device</p><div class="grouped-list"><button class="row-button" data-edit="${id}">${ic('edit')}<span>Edit cards</span>${ic('chevron')}</button><button class="row-button" data-share="${id}">${ic('share')}<span>Share deck</span>${ic('chevron')}</button><button class="row-button" data-export="${id}">${ic('download')}<span>Export backup</span>${ic('chevron')}</button><button class="row-button danger" data-delete="${id}">${ic('minus')}<span>Delete deck</span>${ic('chevron')}</button></div>`, `<button class="button" data-only="${id}">Play this deck</button>`);
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
    editorOpen = false;
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
    url ? "Share deck" : "Share results",
    `<p>${url ? "Anyone with this link can read and import this deck." : "Your round, ready to send."}</p><textarea id="share-content" rows="6" readonly aria-label="Share text">${esc(content)}</textarea>`,
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
    editorOpen = true;
    history.replaceState(null, "", location.pathname + location.search);
    render();
    toast("Shared deck loaded. Review it, then choose Save deck.");
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
  modal("Settings", `<div class="grouped-list"><label class="switch-row"><span>Sound effects</span><input type="checkbox" id="sound" ${state.settings.sound ? 'checked' : ''}></label><label class="switch-row"><span>Haptic feedback</span><input type="checkbox" id="haptics" ${state.settings.haptics ? 'checked' : ''}></label><label class="setting-row"><span>Controls</span><select id="control">${option('tap','Tap / keyboard',state.settings.control)}${option('tilt','Tilt + tap',state.settings.control)}</select></label></div><details class="tilt-options disclosure"><summary>Tilt setup ${ic('chevron')}</summary><div class="disclosure-body"><label class="field"><span>Sensitivity</span><select id="sensitivity">${option('gentle','Gentle',state.settings.sensitivity)}${option('steady','Steady',state.settings.sensitivity)}${option('deliberate','Deliberate',state.settings.sensitivity)}</select></label><p class="footnote">Requires motion permission on a supported phone. Tap controls always stay available.</p>${button('Enable & test tilt','test-tilt','secondary')}<div id="tilt-test"></div></div></details><div class="grouped-list settings-links"><button class="row-button" data-action="help">${ic('info')}<span>How to play</span>${ic('chevron')}</button><button class="row-button" data-action="offline">${ic('download')}<span>Offline play<small>${offlineStatus === 'ready' ? 'Saved on this device' : 'Save all decks for later'}</small></span>${ic('chevron')}</button><button class="row-button" data-action="room">${ic('screen')}<span>Room display</span>${ic('chevron')}</button><button class="row-button" data-action="credits">${ic('heart')}<span>About & credits</span>${ic('chevron')}</button></div><p class="footnote settings-footer">A Btown Brief game · <a href="https://hub.btownbrief.com/">Back to the HUB</a></p>`,button('Done','close-settings'));
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
    "How to play",
    `<ol class="howto"><li><b>Pick your mix.</b><p>One deck or several. Name your group so seen cards stay out of future rounds.</p></li><li><b>Put the phone on your forehead.</b><p>Screen toward your friends. They give clues. You guess out loud. Never say part of the answer, spell it, or rhyme it.</p></li><li><b>Make the call.</b><p>A clue-giver taps Correct or Pass. Accept the same idea or a familiar name; exact wording is not required. With motion enabled, tilt the screen down for correct, up to pass, then return upright. On a laptop: → correct, ← pass, Space pause.</p></li><li><b>Enjoy the reveal.</b><p>Tap the mystery cards to reveal passes. Settle close calls in Review answers before the next person goes.</p></li></ol><p class="callout">Keep the phone comfortable and secure. If tilting is awkward, let a clue-giver hold it and tap. A big room can use a second display from the same browser.</p>`,
    button("Done", "close-modal", "dark"),
  );
}
function credits() {
  modal(
    "About Heads Up",
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
    modal("Room display", "<p>This browser cannot sync a second display. You can still mirror your screen from your device.</p>", button("Done","close-modal"));
    return;
  }
  const u = new URL(location.href);
  u.hash = "";
  u.search = "?display=room";
  modal("Room display", `<p>Open a second view for a projector or an extended display. It shows the current card, timer, and scores.</p><p class="footnote">Use this same browser on this device. Place the display behind the guesser so they can't see the answer.</p>`, `<a class="button" href="${esc(u.href)}" target="_blank" rel="noopener">Open display ${ic("screen")}</a>`);
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
    "Offline play",
    `<p id="offline-message">${offlineStatus === "ready" ? `The game and all ${builtins.length} built-in decks, including the photos, are saved in this browser.` : "Save the game and photo cards in this browser before heading out. Keep this browser’s site data to retain offline access."}</p><p class="small muted">First save is about 22 MB. Offline play needs a successful first visit over HTTPS or localhost. Keep your browser’s site data to preserve saved games and decks.</p><p>On your phone, use your browser's Share or menu button, then <b>Add to Home Screen</b> for a more app-like experience.</p>`,
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
  if (b.dataset.chapter) { activeChapter = b.dataset.chapter; goto("levels"); return; }
  if (b.dataset.manage) { manageDeck(b.dataset.manage); return; }
  if (b.dataset.mixRemove) { toggleDeck(b.dataset.mixRemove); selectedDecks(); return; }
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
    b.innerHTML = `<span>Revealed</span><b>${esc(c.t)}</b><small>${esc(c.deckName)}</small>`;
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
    editorOpen = true;
    closeModal();
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
  if (a === "levels" || a === "all-challenges") {
    activeChapter = null;
    goto("levels");
    return;
  }
  if (a === "library") {
    goto("library");
    return;
  }
  if (a === "new-deck") { editorOpen = true; customEdit = null; customDraft = {name:"",text:""}; goto("custom"); return; }
  if (a === "selected-decks") { selectedDecks(); return; }
  if (a === "edit-group") {
    const p = state.setup.players[0];
    modal("Your group", `${groupField()}<label class="field"><span>Guesser</span><input data-player-name="${p.id}" value="${esc(p.name)}" maxlength="25"></label>`,button("Done","close-settings"));
    return;
  }
  if (a === "quick-replay" || a === "quick-done") {
    const s = state.session;
    completeSession();
    if (a === "quick-replay") state.setup = { ...s.config, players:state.setup.players, teamNames:s.teamNames };
    state.selected = s.deckIds;
    state.session = null;
    persist();
    goto(a === "quick-replay" ? "setup" : "library");
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
    state.setup = { ...s.config, players: s.mode === "quick" ? state.setup.players : s.players, teamNames: s.teamNames };
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
    editorOpen = false;
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
    toast("Add decks, then choose Play to return to your session.");
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
  if (el.id === "mode" || el.id === "rule" || el.id === "difficulty") {
    state.setup[el.id] = el.value;
    if (el.id === "mode" && el.value !== "quick" && state.setup.players.length < 2) {
      state.setup.players.push({id:crypto.randomUUID(), name:"Player 2", team:state.setup.players[0]?.team === "B" ? "A" : "B", extra:0, difficulty:"inherit"});
    }
    if (["teams", "individual"].includes(state.setup.mode)) state.setup.streak = false;
    persist(); render(); return;
  }
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
