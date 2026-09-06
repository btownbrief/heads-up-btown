// Validates data/decks.json. Run after every deck edit: node scripts/validate-decks.mjs
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, '..', 'data', 'decks.json');
const data = JSON.parse(await readFile(file, 'utf8'));
const errors = [];
const err = (m) => errors.push(m);

const MIN = 40, MAX = 80, MAX_TEXT = 60, MAX_HINT = 140;
const DIFF = new Set(['easy', 'local', 'charades']);
const SOURCE = /^(things|history-facts|walking-tour|hobbies|clubs|sunset-spots|restaurants|openings|sports)\.json$|^archive:\d{4}-\d{2}-\d{2}$|^https?:\/\/|^party-content\//;

if (!Array.isArray(data.decks) || data.decks.length === 0) err('no decks');
const ids = new Set();
for (const d of data.decks || []) {
  const tag = `deck ${d.id}`;
  if (!d.id || ids.has(d.id)) err(`${tag}: missing or duplicate id`);
  ids.add(d.id);
  for (const k of ['name', 'emoji', 'blurb']) if (!d[k]) err(`${tag}: missing ${k}`);
  if (!DIFF.has(d.difficulty)) err(`${tag}: difficulty must be one of ${[...DIFF].join('/')}`);
  if (!Array.isArray(d.cards)) { err(`${tag}: cards missing`); continue; }
  if (d.cards.length < MIN || d.cards.length > MAX) err(`${tag}: ${d.cards.length} cards, want ${MIN}–${MAX}`);
  const texts = new Set(); const cids = new Set();
  for (const c of d.cards) {
    const ct = `${tag} / ${c.id || '?'}`;
    if (!c.id || cids.has(c.id)) err(`${ct}: missing or duplicate card id`);
    cids.add(c.id);
    if (typeof c.t !== 'string' || !c.t.trim()) err(`${ct}: empty text`);
    else {
      if (c.t.length > MAX_TEXT) err(`${ct}: text longer than ${MAX_TEXT} chars`);
      const key = c.t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (texts.has(key)) err(`${ct}: duplicate text "${c.t}"`);
      texts.add(key);
    }
    if (typeof c.h !== 'string' || c.h.trim().length < 12) err(`${ct}: hint missing or too short`);
    else if (c.h.length > MAX_HINT) err(`${ct}: hint longer than ${MAX_HINT} chars`);
    if (/\[CONFIRM/i.test(`${c.t} ${c.h}`)) err(`${ct}: [CONFIRM] marker must not ship`);
    if (/\bTODO\b|undefined|NaN/.test(`${c.t} ${c.h}`)) err(`${ct}: placeholder text`);
    if (!c.s || !SOURCE.test(c.s)) err(`${ct}: source "${c.s}" is not a known data file, archive date, or URL`);
  }
}

if (errors.length) {
  console.error(`decks.json: ${errors.length} problem(s)`);
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
const total = data.decks.reduce((n, d) => n + d.cards.length, 0);
console.log(`decks.json ok: ${data.decks.length} decks, ${total} cards (${data.decks.map((d) => `${d.id} ${d.cards.length}`).join(', ')})`);
