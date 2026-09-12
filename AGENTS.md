# Heads Up, Btown! — agent instructions

Read README.md first. This is the 60-deck party game at https://play.btownbrief.com/heads-up-btown/. Plain JavaScript, no runtime dependencies. GitHub Pages publishes **dist/**; source files at the repository root are not served.

- Preserve device-local group history and saved challenge progress. Never silently recycle a card pool. Local state uses `hub-party-v1`; do not touch other games' keys.
- `dist/js/engine.js` and `dist/js/levels.js` stay pure. Supply time and randomness from the caller; keep tilt math testable without a phone.
- Tap controls must always work. Tilt is optional and requires device verification. Sound stays off by default. Hide the network ticker during rounds and room display using both CSS and BtownTicker.hide().
- Published prompts live in `dist/js/decks.js` and `extra-decks.js`. Each deck must have at least 20 unique answers, valid difficulty bands, and provenance. Photo cards retain their attribution and original license. Do not invent factual hints or changing hours/prices.
- `data/decks.json` is the original sourced input snapshot, not runtime content. Its old 40–80-card and sourced-hint rules remain enforced by `scripts/validate-source-decks.mjs`. Quarantined cards remain outside the published content.
- Run `node scripts/validate-decks.mjs`, `node scripts/test-engine.mjs`, and syntax-check touched JavaScript before finishing. `npm test` and `npm run check` cover the published game. For UI changes, play a mobile tap round through countdown, cards, time up, recap, and sharing; report physical-phone limits separately.
- Keep the public URL stable and update the Arcade catalog and HUB description when capabilities change. No login, leaderboard service, Supabase, or camera/microphone is required.
