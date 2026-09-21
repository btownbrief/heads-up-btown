import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { decks } from '../dist/js/decks.js';
import { cardKey, normalize, freshQueue } from '../dist/js/engine.js';

const source = JSON.parse(fs.readFileSync(new URL('../data/decks.json', import.meta.url)));
const quarantine = JSON.parse(fs.readFileSync(new URL('../data/decks-unconfirmed.json', import.meta.url)));
const policy = source.publication;
const cards = decks.flatMap(deck => deck.cards);
const sourceCards = source.decks.flatMap(deck => deck.cards);

test('built decks omit every quarantined title and its known variants', () => {
  const blocked = new Set(quarantine.decks.flatMap(deck => deck.cards.flatMap(card =>
    [card.t, ...(policy.quarantineAliases[card.t] || [])].map(t => cardKey({ t })),
  )));
  for (const card of cards) {
    assert(!blocked.has(cardKey(card)), card.t);
    assert(!blocked.has(cardKey({ t: card.t })), card.t);
  }
});

test('built decks enforce location exclusions and the reviewed theme limits', () => {
  for (const card of [...cards, ...sourceCards])
    assert(!/Bristol Falls|Bolton Potholes|Sea Caves/i.test(`${card.t} ${card.answerKey || ''}`), card.t);
  assert(!cards.some(card => card.id.startsWith('green-mountain-camp-')));
  const towns = cards.filter(card => card.id.startsWith('towns-'));
  assert.equal(towns.length, 20);
  assert.deepEqual(towns.map(card => card.t).sort(), [...policy.keepRawTitles.towns].sort());
  const eat = decks.find(deck => deck.id === 'eat');
  for (const prefix of ['sugar-season', 'market-basket'])
    for (const card of eat.cards.filter(card => card.id.startsWith(`${prefix}-`)))
      assert(policy.keepRawTitles[prefix].includes(card.t), card.t);
  const church = decks.find(deck => deck.id === 'church');
  assert(church.cards.every(card => !policy.churchExcludedIds.includes(card.id)));
  const checked = new Set(sourceCards.map(cardKey));
  for (const card of cards.filter(card => /^(btown-brief|dibs)\//.test(card.source || '')))
    assert(policy.preserveCardIds.includes(card.id) || checked.has(cardKey(card)), card.t);
});

// The engine collapses duplicates at play time (eligibleCards -> uniqueCards), so the build
// only strips them when publication.crossDeckDedupe is on. Guard whichever mode is configured.
test('cross-deck answers are unique when the dedupe pass is enabled', { skip: !policy.crossDeckDedupe && 'publication.crossDeckDedupe is off' }, () => {
  const seen = new Map();
  const preserved = new Set(policy.preserveCardIds);
  for (const card of cards) {
    for (const key of new Set([cardKey(card), normalize(card.t)])) {
      const previous = seen.get(key);
      if (previous) assert(preserved.has(previous.id) && preserved.has(card.id), card.t);
      seen.set(key, card);
    }
  }
});

test('corrected factual clues survive publication and spelling keeps history', () => {
  const assertions = [
    [/Switchback/, /2002/, /1996/],
    [/Lake Monsters/, /summer collegiate.*Centennial Field/, /minor.league/i],
    [/Maritime Museum/, /Ferrisburgh/, /free/i],
    [/Red Rocks Park/, /Cambrian/, /Permian/],
    [/^Pizza 44$/, /Park Street/, /Pine Street/],
    [/Vermont \(steamboat\)/, /1808/, /1809/],
  ];
  for (const [title, expected, rejected] of assertions) {
    for (const pool of [sourceCards, cards]) {
      const matches = pool.filter(card => title.test(card.t) && card.h);
      assert(matches.length > 0, String(title));
      for (const card of matches) {
        assert(expected.test(card.h), card.t);
        assert(!rejected.test(card.h), card.t);
      }
    }
  }
  for (const pool of [sourceCards, cards]) {
    assert(!pool.some(card => /1996|minor.league|Permian|never went dark|\$4\b|3\.5 miles/i.test(card.h || '')));
    assert(!pool.some(card => /moose/i.test(card.t) && /often/i.test(card.h || '')));
    assert(!pool.some(card => card.t === "Al's French Fries"));
    const fries = pool.find(card => card.t === "Al's French Frys");
    assert(fries);
    assert.equal(cardKey(fries), cardKey({ t: "Al's French Fries" }));
    assert.equal(freshQueue([fries], { [cardKey({ t: "Al's French Fries" })]: { at: 1 } }).length, 0);
  }
});
