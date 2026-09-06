# Heads Up, Burlington

The phone-on-your-forehead guessing game with Burlington decks — a
[Btown Games](https://play.btownbrief.com/) production from the
[BTown Brief](https://www.btownbrief.com).

**Play: https://play.btownbrief.com/heads-up-btown/**

- One player holds the phone on their forehead, screen out. Friends shout
  clues. **Tilt down** = got it, **tilt up** = pass. Sixty-second rounds (or
  ninety), a 3-2-1 countdown, then a recap of every card with a one-line
  "what it is" so the clue-givers can settle the arguments. Share the recap
  as text.
- Tilt uses `DeviceOrientation`. iOS asks for motion access once, from the
  START tap. No sensor, or permission denied, and the round falls back to
  **tap**: left half passes, right half is got it. Tap mode can also be picked
  on the home screen. Arrow keys work on a laptop.
- Rotation-locked phones: if the viewport is portrait but the sensor says the
  phone is sideways, the card is rotated so it reads upright to the table.
- Sound is optional and **off by default** (tiny WebAudio beeps, nothing
  downloaded). The screen wake lock is requested during a round.
- No server, no accounts, no leaderboard. `localStorage` remembers settings,
  which cards each deck has already shown (so a table cycles through the
  whole deck before repeats), and a best score per deck. Keys use the `hub-`
  prefix.

## Decks

`data/decks.json` — six decks, 40–80 cards each. Every card is
`{ id, t, h, s }`: the text on the card, the one-line hint shown on the
recap, and where the hint came from (`things.json`, `history-facts.json`,
`walking-tour.json`, `hobbies.json`, `clubs.json`, `sunset-spots.json`,
`restaurants.json`, `openings.json`, `sports.json` from the btown-brief
repo, `archive:YYYY-MM-DD` for a newsletter edition, or a URL).

| id | deck | what |
|---|---|---|
| `church` | Church Street & Downtown | places, top of Church Street to the lake |
| `eat` | Eat Btown | dishes and the spots that serve them |
| `vermont` | Very Vermont | creemee, mud season, sugaring, the mittens |
| `act` | Act It Out: Burlington | charades prompts |
| `lake` | Lake Champlain | beaches, boats, wrecks, the monster |
| `newcomer` | Newcomer Mode | easy, nothing locals-only |

Nothing in a hint is invented. If a fact cannot be traced to one of those
sources, the card gets cut. `DECKS-REVIEW.md` lists the cards that lean on
an outside URL or that Stephen should eyeball.

Run `node scripts/validate-decks.mjs` after any deck edit: it checks card
counts, unique text per deck, hint length, a known source on every card, and
that no `[CONFIRM]` marker ships.

## Code

Plain static site — no build step, no dependencies.

- `js/engine.js` — pure: seeded shuffle and queue, round state machine,
  share text, and the tilt maths (`orientationVector`, `feedTilt`). No DOM,
  no `Date.now()`. Tests: `node scripts/test-engine.mjs`.
- `js/tilt.js` — permission prompt and the `deviceorientation` listener.
- `js/sound.js` — WebAudio cues, off until enabled from a tap.
- `js/main.js` — screens, storage, share, wake lock.

Deployed by GitHub Pages via `.github/workflows/deploy.yml`; `checks.yml`
runs the syntax check, deck validator and engine tests on every push and PR.
