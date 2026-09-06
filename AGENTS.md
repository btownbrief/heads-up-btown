# Heads Up, Burlington — agent instructions

Shared brain for any AI agent working in this repo (Codex, Claude Code, etc.).
Read `README.md` first for how the game works — this file only adds the rules an
agent needs so it doesn't break something. Stephen is non-technical — explain
consequential changes in plain language.

## What this is
The forehead guessing game with Burlington decks: tilt down for got it, tilt up
to pass, sixty seconds, then a recap with a one-line hint per card. Plain
static site, **no build step**: `index.html` + `style.css` + ES modules in
`js/`. Deployed by GitHub Pages via `.github/workflows/deploy.yml` on push to
the default branch. No server, no accounts, no leaderboard, no Supabase.

## Rules that will trip you up
- **Never invent a fact.** Every hint in `data/decks.json` must rest on a line
  in btown-brief data, a newsletter edition, or a URL, and the card's `s` field
  says which. If you cannot source it, cut the card. Card text itself can be a
  place, dish, thing or action; the hint is where truth lives.
- **`js/engine.js` is pure** — no DOM, no `Date.now()`, no storage. Time comes
  in as a number, randomness as a seed. Keep the tilt maths there too so it can
  be tested without a phone: `orientationVector(beta, gamma)` gives the
  screen-normal's vertical component and `feedTilt` turns a stream of those
  into 'got'/'pass' with re-arm hysteresis. Change the thresholds in `TILT`
  only with a test.
- **Tap mode must always work.** Tilt is a progressive enhancement: iOS needs
  a permission tap, some browsers never fire the event, and the smoke suite runs
  headless with no sensor. Any change to the round flow must be playable by
  tapping the two halves of the stage.
- **Deck editing rules:** each deck 40–80 cards, unique text within a deck,
  hint 12–140 characters, a known `s` source, no `[CONFIRM]` markers. Run
  `node scripts/validate-decks.mjs` after **every** deck edit. Questionable
  cards go in `DECKS-REVIEW.md`, not in the shipped JSON.
- Sound stays **off by default**. Never autoplay audio.
- Local state uses the `hub-` prefix (`hub-settings-v1`, `hub-seen-v1`,
  `hub-best-v1`). Do not touch the shared `btown-*` keys other games use.
- The site-wide ticker (`play.btownbrief.com/ticker.js`) is hidden during a
  round by both CSS (`body.in-round`) and `BtownTicker.hide()`. Keep both.
- The name "Heads Up" is also a commercial game's trademark. The name lives in
  `index.html` (title, headings, meta), `manifest.webmanifest`, `README.md` and
  `shareText` in `js/engine.js` — those are the places to change if it is
  ever renamed. Do not scatter it further.

## Before you finish
Run `node scripts/validate-decks.mjs`, `node scripts/test-engine.mjs` and
`node --check` on every touched JavaScript file. For UI changes, load the page
at a phone-sized viewport (390×844) in tap mode and play a round through:
countdown, a few cards, time up, recap, share. Say what you verified and what
you could not (real tilt needs a phone).
