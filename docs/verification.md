# Verification — September 12, 2026

## Automated checks

- 21 Node engine tests plus five challenge-progression tests cover canonical answers across decks, fresh-card exhaustion, eligible rule filters, difficulty progression, scoring deadlines, input debounce, pass caps and time costs, capped streak time, pause/resume, last-card handling, score corrections, balanced team schedules, custom imports, and tilt hold/rearm/noise rejection.
- Content validation checks 60 decks, 3,234 entries, 2,932 canonical answers, difficulty values, forbidden clues, image assets and licensing, HTML asset references, and the offline manifest.
- All application JavaScript and service-worker files pass syntax checks. No third-party runtime dependency or network API is required to play.

## Browser playtests

Performed in the Codex in-app browser, with local static servers and actual UI interaction:

- Inspected the desktop library, mobile portrait (390 × 844), and landscape play (844 × 390). Card text, forbidden words, timer, and controls remain readable.
- Checked the published library and a 325-pixel narrow preview; corrected the game-night action so it sits below the description without covering the heading.
- Played a naturally timed 30-second round through reveal and finale; changed a judgment in review and verified the total updated.
- Reloaded a paused session and resumed at the preserved 19 seconds.
- Created a five-card custom deck, reloaded it, and shared it through a URL fragment. Opened that link on a separate origin and verified Unicode, difficulty, forbidden clues, review, and save.
- Exhausted the five-card deck using correct, pass, and challenge judgments. The round ended without recycling; its three-point score and group history were retained.
- Played a four-player team session (Alex/Sam/Jordan/Taylor). The order alternated teams; One Clue Each rotated the clue-giver; the final scoreboard correctly showed a 2–2 tie.
- Opened a room display and verified its live answer, timer, and running team scores. This uses the same browser profile; cross-device synchronization is not claimed.
- Played a two-player cooperative photo session through its final target result. Real local photographs and their credits loaded.
- Saved the full offline pack, stopped the isolated test server, verified the server was unreachable, and reloaded successfully from cached files. Resumed the saved photo round and completed the cooperative session while the server remained off.
- Exercised the registered WebMCP deck inventory and deck-mix tool, including invalid deck rejection.

The playtests exposed and resolved a final-score reference error, room-window persistence interference, and native-share behavior that needed a reliable copy-link dialog. These flows were then exercised again after their fixes.

## Physical-device acceptance still needed

Tilt direction and hold behavior have automated mathematical coverage, but physical iOS/Android motion, sensor permission prompts, haptics, wake lock, and forehead ergonomics have not been tested on a real phone. Tap and keyboard controls are the tested fallback. Speech recognition and recording are deliberately absent, as described in the design decisions.

Offline behavior depends on the browser retaining its cache. The successful local offline test does not prove that an owner-private hosting authentication gateway can be entered without an internet connection. Shared custom-deck links also retain the host's audience restrictions.

## Expanded-goal verification

Five additional tests verify all 36 levels have enough eligible cards for their gold target; each path starts open; a star unlocks only its next level; thresholds are exact; replays preserve personal bests and cannot double-count attempts; and finalized score corrections affect awards. In the browser at 325 pixels wide, played level 1 to three correct answers, finalized one star, reloaded, verified the best score and one attempt persisted, confirmed level 2 unlocked while level 3 stayed locked, and opened level 2 successfully.

Saved all 59 offline files after the expansion, stopped the local server, confirmed connection refusal, and reloaded the 60-deck game. The 36-level trail, earned star, best score, attempt count, and correct locked/unlocked states remained usable with the server off.

The final import audit found that unrecognized difficulty names silently defaulted to Medium and inherited object keys could produce invalid card values. The parser now rejects unknown difficulties, excess columns, blank/punctuation-only forbidden clues, and duplicate forbidden clues with a card-specific error. Two regression tests cover those failures plus valid case-insensitive difficulty input; all 28 tests pass.

## GitHub Pages release check — September 12, 2026

The public release uses the existing `play.btownbrief.com/heads-up-btown/` path and publishes only `dist/`. The original six-deck source snapshot still validates (354 cards), the 60-deck runtime validates, and all 28 engine/progression tests pass. The public hosting route has no Sites audience gateway.

At 390 × 844 in the in-app browser, played a fresh 30-second tap round through countdown, correct, pass, natural time up, passed-card reveal, and the share-text dialog. The recap showed one correct, one pass, and the expected one-point total. The body stayed 390 pixels wide; the network ticker was hidden during play and returned for the recap. Browser error logs were empty. This is browser acceptance, not physical sensor verification.
