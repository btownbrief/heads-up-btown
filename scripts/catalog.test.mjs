import test from 'node:test';
import assert from 'node:assert/strict';
import { decks } from '../dist/js/decks.js';
import { levels } from '../dist/js/levels.js';
import { defaults, migrateCatalogState } from '../dist/js/storage.js';
import { resolveDeckIds } from '../dist/js/catalog.js';
import { cardKey, eligibleCards, freshQueue, normalize } from '../dist/js/engine.js';

test('familiar defaults exclude deep cuts and still support forbidden words and custom decks', () => {
  assert.equal(defaults.setup.difficulty, 'familiar');
  assert.deepEqual(defaults.selected, ['warmup']);
  const ids = decks.map(d=>d.id), pool = eligibleCards(decks,ids,{difficulty:'familiar'});
  assert(pool.length > 2000);
  assert(pool.every(c=>c.d <= 2));
  assert(eligibleCards(decks,ids,{difficulty:'3'}).length > 300);
  assert(eligibleCards(decks,ids,{difficulty:'familiar',rule:'forbidden'}).every(c=>c.ban?.length===3 && c.d<=2));
  const custom = [{id:'custom',name:'Friends',cards:[{t:'Inside joke',d:2}]}];
  assert.equal(eligibleCards(custom,['custom'],{difficulty:'familiar'}).length,1);
});
test('old selections migrate without replacing an in-progress round or earned progress', () => {
  const state = structuredClone(defaults);
  delete state.catalogVersion;
  state.selected=['north-end','south-end','church','winter-kit','custom-jokes'];
  state.setup.difficulty='mixed';
  state.progress={'group:friends':{'first-1':{stars:2,best:7}}};
  state.session={deckIds:['north-end','vermont-dogs'],config:{difficulty:'mixed'},round:{phase:'paused',queue:[{t:'UVM',d:1}],remaining:23000}};
  const progress=structuredClone(state.progress), round=structuredClone(state.session.round);
  migrateCatalogState(state);
  assert.deepEqual(state.selected,['church','seasons','custom-jokes']);
  assert.deepEqual(state.session.deckIds,['church','pet-chaos']);
  assert.deepEqual(state.session.round,round);
  assert.deepEqual(state.progress,progress);
  assert.equal(state.session.config.difficulty,'mixed');
  assert.equal(state.setup.difficulty,'familiar');
  state.setup.difficulty='mixed';
  migrateCatalogState(state);
  assert.equal(state.setup.difficulty,'mixed','an explicit later choice must survive');
});
test('history keeps renamed answers and article variants out of fresh queues', () => {
  const state=structuredClone(defaults);delete state.catalogVersion;
  state.groups={friends:{name:'Friends',seen:{'a dog':{at:2},dog:{at:1},'btv airport':{at:4},uvm:{at:3},'lobster roll at shanty':{at:5}}}};
  migrateCatalogState(state);
  const seen=state.groups.friends.seen;
  assert.equal(seen.dog.at,2);
  const cards=eligibleCards(decks,decks.map(d=>d.id));
  const forbidden=['Dog','A dog','University of Vermont','Burlington International Airport','Lobster roll'];
  for(const answer of forbidden) assert(!freshQueue(cards,seen).some(c=>normalize(c.t)===normalize(answer)),answer);
  const edited=cards.find(c=>c.t==='Doing yoga on a dock');
  assert(edited);
  assert.equal(cardKey(edited),cardKey({t:'Doing 7 AM yoga on the floating dock'}));
  assert.equal(freshQueue([edited],{[cardKey(edited)]:{at:1}}).length,0);
});
test('the broader catalog is substantial and all retired level selections resolve', () => {
  const general=decks.filter(d=>d.group!=='local'),local=decks.filter(d=>d.group==='local');
  assert.equal(general.length,36);assert.equal(local.length,8);
  assert(general.every(d=>d.cards.length>=60));
  assert(local.filter(d=>!d.photo).every(d=>d.cards.length>=90));
  assert.equal(decks.find(d=>d.id==='photos').cards.length,38);
  const ids=new Set(decks.map(d=>d.id));
  for(const level of levels) assert(level.deckIds.every(id=>ids.has(id)),level.id);
  assert.deepEqual(resolveDeckIds(['campus','vermont-dogs','newcomer']),['school-days','pet-chaos','church']);
});
test('short familiar words survive while acronym-only insider prompts are gone', () => {
  const pool=eligibleCards(decks,decks.map(d=>d.id),{difficulty:'familiar'});
  for(const word of ['Dog','Cat','Sun']) assert(pool.some(c=>normalize(c.t)===normalize(word)),word);
  for(const word of ['UVM','The OP','BCA Center','BTV Airport','EVE','U2','DNA']) assert(!pool.some(c=>c.t===word),word);
});
