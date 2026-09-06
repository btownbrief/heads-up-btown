// HEADS UP, BURLINGTON — DOM, storage, sensors, share. Game logic is in
// js/engine.js (pure); sensor plumbing in js/tilt.js; beeps in js/sound.js.
import {
  buildQueue, createRound, startPlaying, currentCard, timeLeft, tick, mark, summary,
  shareText, COUNTDOWN_SECONDS, ROUND_LENGTHS, DEFAULT_SECONDS, createRotation, nextRotation,
} from './engine.js';
import { tiltSupported, needsPermission, requestTilt, listenTilt } from './tilt.js';
import { setEnabled as setSound, cue } from './sound.js';

const $ = (id) => document.getElementById(id);
const URL_SELF = 'https://play.btownbrief.com/heads-up-btown/';
const SETTINGS_KEY = 'hub-settings-v1';
const SEEN_KEY = 'hub-seen-v1';
const BEST_KEY = 'hub-best-v1';

// ------------------------------------------------------------ storage
function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v && typeof v === 'object' ? v : fallback; }
  catch { return fallback; }
}
function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } }

const settings = { seconds: DEFAULT_SECONDS, control: 'tilt', sound: false, ...load(SETTINGS_KEY, {}) };
if (!ROUND_LENGTHS.includes(settings.seconds)) settings.seconds = DEFAULT_SECONDS;
if (settings.control !== 'tap') settings.control = 'tilt';
settings.sound = Boolean(settings.sound);
const seen = load(SEEN_KEY, {});
const best = load(BEST_KEY, {});

// ------------------------------------------------------------ state
let DECKS = [];
let deck = null;
let round = null;
let raf = 0;
let stopTilt = null;
let wakeLock = null;
let lastGesture = 0;
let countdownTimer = 0;
let tapFallbackOffered = false;

// ------------------------------------------------------------ screens
const screens = ['home', 'ready', 'play', 'recap'];
function show(name) {
  for (const s of screens) $(s).classList.toggle('hidden', s !== name);
  document.body.classList.toggle('in-round', name === 'play');
  // The site-wide news ticker sits over the tap zones; tuck it away mid-round.
  try { if (window.BtownTicker) (name === 'play' ? window.BtownTicker.hide() : window.BtownTicker.show()); } catch { /* ignore */ }
  window.scrollTo(0, 0);
}

function toast(msg, ms = 1800) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}

// ------------------------------------------------------------ home
function renderDecks() {
  const grid = $('deckGrid');
  grid.innerHTML = '';
  for (const d of DECKS) {
    const b = document.createElement('button');
    b.className = 'deck';
    b.setAttribute('role', 'listitem');
    b.dataset.id = d.id;
    const bestScore = best[d.id];
    b.innerHTML = `
      <div class="emoji">${d.emoji}</div>
      <div class="name">${esc(d.name)}</div>
      <div class="blurb">${esc(d.blurb)}</div>
      <div class="meta">${d.cards.length} cards${typeof bestScore === 'number' ? ` · best <b>${bestScore}</b>` : ''}</div>`;
    b.addEventListener('click', () => openReady(d));
    grid.appendChild(b);
  }
}
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function renderSettings() {
  document.querySelectorAll('[data-seconds]').forEach((b) => b.classList.toggle('sel', Number(b.dataset.seconds) === settings.seconds));
  document.querySelectorAll('[data-control]').forEach((b) => b.classList.toggle('sel', b.dataset.control === settings.control));
  const sb = $('soundBtn');
  sb.setAttribute('aria-pressed', String(settings.sound));
  sb.textContent = settings.sound ? '🔊 Sound on' : '🔇 Sound off';
}
document.querySelectorAll('[data-seconds]').forEach((b) => b.addEventListener('click', () => {
  settings.seconds = Number(b.dataset.seconds); save(SETTINGS_KEY, settings); renderSettings();
}));
document.querySelectorAll('[data-control]').forEach((b) => b.addEventListener('click', () => {
  settings.control = b.dataset.control; save(SETTINGS_KEY, settings); renderSettings();
}));
$('soundBtn').addEventListener('click', () => {
  settings.sound = !settings.sound; save(SETTINGS_KEY, settings); setSound(settings.sound); renderSettings();
  if (settings.sound) cue.go();
});
$('settingsBtn').addEventListener('click', () => {
  $('settingsRow').scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast('Round length, tilt or tap, sound');
});

// ------------------------------------------------------------ overlays
$('helpBtn').addEventListener('click', () => $('helpOverlay').classList.remove('hidden'));
document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('.overlay').classList.add('hidden')));
document.querySelectorAll('.overlay').forEach((o) => o.addEventListener('click', (e) => { if (e.target === o) o.classList.add('hidden'); }));

// ------------------------------------------------------------ ready
function openReady(d) {
  deck = d;
  $('readyEmoji').textContent = d.emoji;
  $('readyName').textContent = d.name;
  $('readyBlurb').textContent = d.blurb;
  const steps = $('ready').querySelector('.ready-steps');
  steps.children[2].innerHTML = settings.control === 'tap'
    ? 'They give clues. Tap the <b>right side</b> for got it, the <b>left side</b> to pass.'
    : 'They give clues. <b>Tilt down</b> for got it, <b>tilt up</b> to pass.';
  if (d.difficulty === 'charades') steps.children[2].innerHTML = 'Friends <b>act it out</b>, no talking. ' + steps.children[2].innerHTML;
  let note = '';
  if (settings.control === 'tilt' && !tiltSupported()) note = 'No tilt sensor here, so this round uses tap: left passes, right is got it.';
  else if (settings.control === 'tilt' && needsPermission()) note = 'Your phone will ask for motion access once. That is the tilt.';
  $('readyNote').textContent = note;
  const seenCount = (seen[d.id] || []).length;
  $('readyMeta').textContent = `${settings.seconds} seconds · ${d.cards.length} cards${seenCount ? ` · ${seenCount} already seen` : ''}`;
  show('ready');
}
$('readyBack').addEventListener('click', () => show('home'));
$('startBtn').addEventListener('click', startRound);

// ------------------------------------------------------------ round
async function startRound() {
  if (!deck) return;
  setSound(settings.sound);
  let control = settings.control;
  if (control === 'tilt') {
    if (!tiltSupported()) control = 'tap';
    else {
      const perm = await requestTilt();
      if (perm !== 'granted') { control = 'tap'; toast(perm === 'denied' ? 'Motion access denied. Tap mode.' : 'No tilt here. Tap mode.', 2400); }
    }
  }

  // Cycle the deck: unseen first, reset once everyone has been shown.
  let seenIds = Array.isArray(seen[deck.id]) ? seen[deck.id] : [];
  if (seenIds.length >= deck.cards.length) seenIds = [];
  const queue = buildQueue(deck.cards, `${deck.id}:${Date.now()}`, seenIds);
  round = createRound({ deckId: deck.id, queue, seconds: settings.seconds });
  round.control = control;

  const stage = $('stage');
  stage.classList.toggle('tap', control === 'tap');
  stage.classList.remove('rot', 'cw', 'ccw');
  $('flash').className = 'flash';
  $('cardText').innerHTML = '';
  $('timerFill').style.width = '100%';
  $('timerNum').textContent = String(round.seconds);
  $('countdown').textContent = String(COUNTDOWN_SECONDS);
  $('countdown').classList.remove('hidden');
  show('play');
  requestWakeLock();
  tapFallbackOffered = false;

  if (control === 'tilt') {
    stopTilt = listenTilt({
      onGesture: (g) => onGesture(g, 'tilt'),
      onVector: (v) => updateRotation(v),
      onSilent: () => {
        // Permission said yes but nothing arrives (desktop, some Androids). Offer taps.
        if (!round || round.phase === 'done' || tapFallbackOffered) return;
        tapFallbackOffered = true;
        stage.classList.add('tap');
        toast('No motion data. Tap: left passes, right is got it.', 2600);
      },
    });
  }

  // 3-2-1
  let n = COUNTDOWN_SECONDS;
  cue.tick();
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    n -= 1;
    if (n > 0) { $('countdown').textContent = String(n); cue.tick(); return; }
    clearInterval(countdownTimer);
    $('countdown').classList.add('hidden');
    round = startPlaying(round, performance.now());
    cue.go();
    renderCard();
    loop();
  }, 1000);
}

function loop() {
  cancelAnimationFrame(raf);
  const step = () => {
    if (!round || round.phase !== 'playing') return;
    const now = performance.now();
    round = tick(round, now);
    const left = timeLeft(round, now);
    $('timerNum').textContent = String(left);
    const frac = Math.max(0, 1 - (now - round.startedAt) / (round.seconds * 1000));
    $('timerFill').style.width = `${frac * 100}%`;
    if (round.phase === 'done') { endRound(); return; }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

function renderCard() {
  const c = currentCard(round);
  const el = $('cardText');
  if (!c) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="inner">${esc(c.t)}</div>`;
  fitText(el);
}

// Shrink the type until the prompt fits the stage. Short words get huge,
// charades sentences stay readable.
function fitText(el) {
  const inner = el.firstElementChild;
  if (!inner) return;
  const box = el.getBoundingClientRect();
  const maxW = box.width * 0.86, maxH = box.height * 0.78;
  let size = Math.min(box.width * 0.24, box.height * 0.26);
  const min = 22;
  el.style.fontSize = `${size}px`;
  let guard = 40;
  // Words are never broken mid-word (see .inner in style.css), so a long word
  // overflows sideways and scrollWidth reports it; shrink until it fits.
  while (guard-- > 0 && size > min && (inner.scrollWidth > maxW || inner.getBoundingClientRect().height > maxH)) {
    size = Math.max(min, size * 0.9);
    el.style.fontSize = `${size}px`;
  }
}

function onGesture(verdict, source) {
  if (!round || round.phase !== 'playing') return;
  const now = performance.now();
  if (now - lastGesture < 350) return; // one card per tilt, not one per frame
  lastGesture = now;
  round = mark(round, verdict, now);
  const flash = $('flash');
  flash.textContent = verdict === 'got' ? 'GOT IT' : 'PASS';
  flash.className = `flash ${verdict}`;
  if (verdict === 'got') cue.got(); else cue.pass();
  if (navigator.vibrate && source === 'tap') { try { navigator.vibrate(verdict === 'got' ? 30 : 15); } catch { /* ignore */ } }
  setTimeout(() => { if (flash.classList.contains(verdict)) flash.className = 'flash'; }, 420);
  if (round.phase === 'done') { endRound(); return; }
  renderCard();
}
$('tapGot').addEventListener('click', () => onGesture('got', 'tap'));
$('tapPass').addEventListener('click', () => onGesture('pass', 'tap'));
document.addEventListener('keydown', (e) => {
  if (!round || round.phase !== 'playing') return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') onGesture('got', 'key');
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') onGesture('pass', 'key');
  else if (e.key === 'Escape') quitRound();
});
$('quitBtn').addEventListener('click', quitRound);

function quitRound() {
  if (!round) return;
  if (round.phase === 'playing') {
    round = { ...round, phase: 'done', endedAt: performance.now(), reason: 'quit' };
    endRound();
  } else {
    teardownRound();
    show('home');
  }
}

function teardownRound() {
  cancelAnimationFrame(raf);
  clearInterval(countdownTimer);
  if (stopTilt) { stopTilt(); stopTilt = null; }
  releaseWakeLock();
  $('stage').classList.remove('rot', 'cw', 'ccw');
  rot = createRotation(); // the classes are gone, so the state must forget too, or the next round in the same pose never re-rotates
}

function endRound() {
  teardownRound();
  const flash = $('flash');
  flash.textContent = round.reason === 'deck-exhausted' ? 'DECK DONE' : "TIME'S UP";
  flash.className = 'flash timeup';
  cue.timeUp();
  // Remember what the table has seen and the best score.
  const shown = round.results.map((r) => r.id);
  const prev = Array.isArray(seen[round.deckId]) ? seen[round.deckId] : [];
  seen[round.deckId] = [...new Set(prev.concat(shown))];
  if (seen[round.deckId].length >= deck.cards.length) seen[round.deckId] = [];
  save(SEEN_KEY, seen);
  const { score } = summary(round);
  if (!(typeof best[round.deckId] === 'number') || score > best[round.deckId]) { best[round.deckId] = score; save(BEST_KEY, best); }
  setTimeout(renderRecap, 1300);
}

// Rotation-locked phones: if the viewport is portrait but the phone is
// physically sideways, turn the stage so the words read upright to the table.
let rot = createRotation();
function updateRotation(v) {
  const portrait = window.innerHeight >= window.innerWidth;
  const r = nextRotation(rot, portrait, v.xUp);
  rot = r.state;
  if (!r.changed) return;
  const stage = $('stage');
  stage.classList.remove('rot', 'cw', 'ccw');
  if (r.want) {
    stage.style.setProperty('--w', `${window.innerHeight}px`);
    stage.style.setProperty('--h', `${window.innerWidth}px`);
    stage.classList.add('rot', r.want);
  }
  if (round && round.phase === 'playing') renderCard();
}
window.addEventListener('resize', () => { if (round && round.phase === 'playing') renderCard(); });

// ------------------------------------------------------------ recap
function renderRecap() {
  const { got, passed, score } = summary(round);
  $('recapDeck').textContent = `${deck.emoji} ${deck.name}`;
  $('recapScore').textContent = String(score);
  $('recapScoreLabel').textContent = score === 1 ? 'got' : 'got';
  const reason = round.reason === 'deck-exhausted' ? 'You went through the whole deck.' : round.reason === 'quit' ? 'Round ended early.' : `${round.seconds} seconds.`;
  $('recapSub').textContent = `${passed.length} passed · ${reason}${typeof best[deck.id] === 'number' ? ` Best on this deck: ${best[deck.id]}.` : ''}`;
  fillList($('gotList'), got, 'Nothing yet. Tough table.');
  fillList($('passList'), passed, 'No passes. Show-offs.');
  renderDecks();
  show('recap');
}
function fillList(ul, rows, emptyMsg) {
  ul.innerHTML = '';
  if (!rows.length) { ul.innerHTML = `<li class="empty">${esc(emptyMsg)}</li>`; return; }
  for (const r of rows) {
    const li = document.createElement('li');
    li.innerHTML = `<div class="t">${esc(r.t)}</div><div class="h">${esc(r.h)}</div>`;
    ul.appendChild(li);
  }
}
$('againBtn').addEventListener('click', () => openReady(deck));
$('decksBtn').addEventListener('click', () => show('home'));
$('shareBtn').addEventListener('click', async () => {
  const text = shareText(round, deck.name, URL_SELF);
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch { /* cancelled → clipboard */ }
  }
  try { await navigator.clipboard.writeText(text); toast('Copied. Paste it in the group chat.'); }
  catch { toast('Could not copy on this browser.'); }
});

// ------------------------------------------------------------ wake lock
async function requestWakeLock() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch { wakeLock = null; }
}
function releaseWakeLock() { try { wakeLock?.release(); } catch { /* ignore */ } wakeLock = null; }
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && round && round.phase === 'playing') requestWakeLock();
});

// ------------------------------------------------------------ boot
async function boot() {
  renderSettings();
  try {
    const res = await fetch('data/decks.json', { cache: 'no-cache' });
    const data = await res.json();
    DECKS = data.decks;
  } catch {
    $('deckGrid').innerHTML = '<p class="tag">Could not load the decks. Reload the page.</p>';
    return;
  }
  renderDecks();
  const q = new URLSearchParams(location.search).get('deck');
  const pre = DECKS.find((d) => d.id === q);
  if (pre) openReady(pre);
}
boot();
