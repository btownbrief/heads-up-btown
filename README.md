# Heads Up, Btown!

**Play: https://play.btownbrief.com/heads-up-btown/**

A complete device-local party game for Burlington and Vermont. Vanilla JavaScript, no build step, no third-party runtime libraries, no camera/microphone or analytics. Everything under `dist/` is the distributable app.

## Run and verify

```sh
npm run dev
npm test
npm run check
```

Development serves `http://localhost:5197`. On a real phone, serve over HTTPS for motion permission, service workers, and wake lock. Tap and keyboard gameplay work without sensors. Open Settings → Enable & test tilt on the phone before using it on your forehead.

## Interface

Three main tabs: **Decks**, **Challenges**, and **My Decks**. Tap a deck to select it; the information icon opens a preview. The single Play button opens a compact setup with mode, time, and clue style. Player/group settings and advanced house rules expand when needed. Challenges open one path at a time. Custom decks use a list with separate creation and editing screens. Quick rounds finish with replay/done actions on the recap, without a duplicate finale.

The interface uses system typography, restrained colors, clear primary/secondary controls, and touch-friendly spacing. No promotional panels, external news ticker, or account flow. All game modes, decks, saved groups, custom content, and challenge progress are preserved.

## The game

- 44 curated decks: 36 general and 8 larger local collections. 4,075 card entries, **3,786 distinct answers** after cross-deck canonicalization. 38 credited local photo cards and 347 distinct answers with hand-authored forbidden clues. Counts are measured, not estimated.
- Quick play, individual sessions, two teams, and a cooperative target. 2–16 named players for sessions; quick play needs a guesser and friends who give clues. Teams alternate and receive equal turns with uneven rosters. Rounds last 30, 60, 90, or 120 seconds; 1–5 laps. Optional final 30-second lap for competition.
- Classic, One Clue Each, Forbidden Words, Act it out, One word only, Character voices, Hum along, and Party shuffle. Act/Hum decks keep their rule in Classic. Forbidden and Hum explicitly filter for eligible content. Party shuffle changes rules between turns.
- Each group name gets device-local answer history across decks and sessions. Common aliases normalize to the same answer. Shown cards, including unanswered last cards, are remembered immediately. **Exhaustion ends the round**; users must deliberately begin a new card cycle. No hidden automatic recycle.
- Familiar cards are the default: easy and medium prompts, with deep cuts reserved for an explicit All cards, Hard, or challenge selection. Expanded abbreviations, shorter actions, and accepting the same idea remove the exact-wording trap. New players start with the general Icebreaker deck.
- Difficulty bands and per-person difficulty/extra time. The optional ramp selects an easy, medium, or hard band according to the current third of the round, with nearest-band fallback when the desired band is exhausted.
- Optional pass cap/time cost. Streak sparks: +2 seconds starting with the third successive correct answer, capped at +10 seconds, available only in quick/co-op. A 450 ms input guard prevents duplicate scoring from rapid taps.
- Pause masks the answer, stops the timer, releases the wake lock, and detaches motion sensors. Switching away pauses an active round; countdowns cancel safely. Saved sessions resume after reload. Late events cannot score after the deadline.
- Passed cards get a tap-to-reveal moment. Review corrects score judgments before continuing. Corrections change points but not time already played. Honor-system challenges can disallow a card without using the microphone.
- Plain-text/JSON custom deck import, editing, JSON backup/export, and self-contained URL-fragment sharing. 5–500 unique answers, each 1–110 characters. Large links fall back to file export. Shared links are staged for review before saving.
- Room display: a second tab/window **in the same browser profile**, synchronized through BroadcastChannel, for a projector or extended display. It is not cross-device multiplayer. Keep it behind the guesser. No remote services are involved.
- Offline save explicitly downloads the app, self-hosted fonts, all decks, and photo assets (~22 MB). Core files also cache on first successful visit. Browser storage must be retained. The public GitHub Pages game requires no login.

## A broader shelf

General-interest decks lead the library. Around the house, Things you wear, School days, Road trip, Free time, and Faces & feelings add 540 familiar prompts. Ten previously small general decks each gain 40 cards. The former local shelf becomes eight collections, with generic college and pet content moved into general decks. Text collections contain 99–252 cards; the credited photo deck retains all 38 images. All 36 general decks contain at least 60 cards.

Saved selections and challenge deck references follow merged IDs. Current rounds retain their queue and clock. Renamed answers and variants such as “A dog”/“Dog” keep a shared history key; upgrading never clears group history or challenge progress.

## Challenge trail

36 levels across six paths: Find your rhythm, The hometown trail, Take the stage, Culture club, Think sideways, and Party legends. Each path starts open; earn one star to unlock its next level. Three score thresholds reward mastery, with personal bests and attempts saved per group. Challenge time and difficulty are fixed; handicaps, time bonuses, and pass penalties do not carry into levels. Progress uses the same group card history as game nights and never silently recycles cards. Levels introduce acting, humming, one-word, clue rotation, and forbidden-word skills.

## Controls

Tap Pass / Correct; arrow left / right; Space or Escape pauses; Space resumes. N moves to the next clue-giver in One Clue Each. On supported phones, screen down = correct, up = pass, then return upright. Three selectable thresholds with a time-based hold and neutral rearming prevent sustained tilt or momentary nods from repeatedly firing. Sound starts off. Haptics are feature-detected.

## Files and ownership

- `dist/js/engine.js`: pure rules, scoring, queue selection, aliases, schedules, parser, tilt math.
- `dist/js/main.js`: accessible DOM views, session orchestration, lifecycle, custom editing, room view, browser capabilities.
- `dist/js/storage.js`: `hub-party-v1` device-local state, separate from the old Heads Up game's keys.
- `dist/js/decks.js` and `extra-decks.js`: original editorial snapshots, with provenance per card.
- `dist/js/general-decks.js`: six new everyday collections, 400 additions to smaller general decks, and authored forbidden clues.
- `dist/js/catalog.js`: editorial wording changes and collection merges. Stable answer keys and the storage migration preserve seen-card history, saved sessions, and earned progress.
- `scripts/build-decks.mjs`: intentional content rebuild from the named Btown repos plus authored general material. **Do not run it unless refreshing content**; it requires those source checkouts.
- `scripts/prepare-assets.py`: one-time asset import, photo attribution, font download. Requires the named source photo repo.
- `scripts/prepare-offline.mjs`: regenerate the offline asset manifest if files are added or removed.
- `docs/content-inventory.json`, `docs/design-decisions.md`, `docs/verification.md`: editorial counts, feedback decisions, and validation evidence.

Source repo files were read and copied; the existing games and newsletter repos were not modified. Source hints with changing hours, prices, and schedules were deliberately not copied into the player flow. Photo originals are unmodified and all licenses are linked in `dist/credits.html`.

## Deliberately excluded from this edition

No microphone auto-advance or automatic banned-word enforcement: a room microphone cannot reliably tell a guesser from overlapping clue-givers. No video recording or automatic highlights, community voting, or live shared authoring. These need separate consent, moderation/storage, and device trials. Custom-file/link sharing and the room's challenge button provide complete simpler alternatives. No forced phone relay during a running clock or random double-point cards; handoffs occur between turns and competitive scoring remains comparable.

## API references

The app feature-detects browser capabilities. See [MDN service worker lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) and the [Device Orientation specification](https://www.w3.org/TR/orientation-event/). Real device motion and haptics must be checked on physical phones; browser-sized screenshots are not sensor tests.

## Publishing and discovery

GitHub Pages publishes only `dist/` after tests and validation pass on `main`. Source snapshots in `data/`, authoring scripts, and internal verification notes are not included in the Pages artifact. The earlier six-deck app remains in Git history before this release. `data/decks.json` and the quarantined source cards remain as authoring inputs, checked separately by `scripts/validate-source-decks.mjs`. The game never reads those snapshots at runtime.

The Arcade entry is in `btownbrief/btownbrief.github.io/games.json`; network search reads the same `games.json` feed; the described HUB tile is in `btownbrief/hub/index.html`. Keep the public URL stable. The news ticker is intentionally omitted. Settings contains the HUB link, help, offline save, and room display.
