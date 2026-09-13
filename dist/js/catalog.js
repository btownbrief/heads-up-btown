import { cardKey, normalize, uniqueCards } from './engine.js';
import { generalDecks, additions } from './general-decks.js';

// Stable destination IDs let old selections, saved sessions, and level IDs survive.
export const collections = [
  ['church', 'Burlington & neighbors', 'Familiar landmarks, downtown favorites, and the next town over.', ['church', 'newcomer', 'south-end', 'north-end', 'beyond-btown', 'arts', 'landmarks']],
  ['eat', 'Vermont food & drink', 'Creemees, maple, market baskets, and local tables.', ['eat', 'cafe', 'night', 'sugar-season', 'market-basket']],
  ['vermont', 'Vermont favorites', 'Maple country, mountain towns, and homegrown names.', ['vermont', 'towns', 'vt-icons']],
  ['lake', 'Lake, trail & campfire', 'Lake days, outdoor places, and camping essentials.', ['lake', 'outside', 'green-mountain-camp']],
  ['act', 'Act like a local', 'Short, playable actions with a Vermont accent.', ['act', 'lake-charades']],
  ['seasons', 'A year in Vermont', 'Snow days, leaf piles, and everything between.', ['seasons', 'winter-kit', 'foliage']],
  ['only-here', 'Life around here', 'Porch hangs, muddy boots, and everyday local adventures.', ['only-here', 'btown-commute', 'btown-host', 'rural-vt']],
  ['photos', 'Btown, in pictures', 'Real local photographs. Describe what you see.', ['photos']],
];
const destinations = new Map(collections.flatMap(([id,,, members]) => members.map(member => [member, id])));
destinations.set('vermont-dogs', 'pet-chaos');
destinations.set('campus', 'school-days');
export const resolveDeckIds = ids => [...new Set(ids.map(id => destinations.get(id) || id))];

// Display wording can improve without making previously seen answers fresh again.
const rewrites = new Map([
  ['UVM', 'University of Vermont'], ['BCA Center', 'Burlington City Arts'],
  ['BCA Center (old Firehouse)', 'Burlington City Arts'], ['The OP', 'The Other Place'],
  ['The Other Place (OP)', 'The Other Place'], ['BTV Airport', 'Burlington International Airport'],
  ['ECHO', 'ECHO science museum'], ['ECHO Leahy Center for Lake Champlain', 'ECHO science museum'],
  ['ECHO & the Boathouse', 'ECHO science museum'], ['UVM Green', 'University Green'],
  ['E.T.', 'E.T. the Extra-Terrestrial'], ['Up', 'Up (the movie)'], ['Elf', 'Elf (the movie)'],
  ['EVE', 'EVE from WALL-E'], ['U2', 'U2 (the band)'], ['ABBA', 'ABBA (the band)'],
  ['YMCA', 'YMCA (the song)'], ['DNA', 'DNA (genetic material)'],
  ['A DJ', 'A disc jockey'], ['A CSA share', 'A farm produce subscription'],
  ['The FRAME', 'The Moran Frame'], ['The Moran FRAME', 'The Moran Frame'],
  ['VAST snowmobile trails', 'Snowmobile trails'], ['SD Ireland cement truck parade', 'The cement truck parade'],
  ['Waiting for a Green Mountain Transit bus in February', 'Waiting for a bus in the snow'],
  ['Night skiing at Bolton under the lights', 'Night skiing'],
  ['Riding a bike into the wind on the causeway', 'Cycling into the wind'],
  ['Catching the bike ferry across the causeway gap', 'Catching the bike ferry'],
  ['Boiling sap in the driveway', 'Boiling maple sap'],
  ['Ice fishing in a shanty on Malletts Bay', 'Ice fishing'],
  ['Waiting for a brunch table at Sneakers', 'Waiting for brunch'],
  ["Looking for the door to Lincoln's", 'Finding a hidden bar'],
  ['Dodging a juggler at Festival of Fools', 'Dodging a juggler'],
  ['Swinging on the yellow porch swings at Waterfront Park', 'Swinging on a porch swing'],
  ['Leaning on a cannon at Battery Park for sunset', 'Watching the sunset'],
  ['Swimming behind the waterfall at Bristol Falls', 'Swimming under a waterfall'],
  ['Jumping into the Bolton Potholes', 'Jumping into a swimming hole'],
  ['Standing in line for Free Cone Day', 'Waiting for free ice cream'],
  ['Contra dancing at Queen City Contras', 'Contra dancing'],
  ["Singing karaoke at JP's Pub", 'Singing karaoke'],
  ['Climbing the tower at Ethan Allen Park', 'Climbing a lookout tower'],
  ['Riding an e-bike down the Greenway', 'Riding an electric bike'],
  ['Waiting for a Fiddlehead can release', 'Waiting at a brewery'],
  ['Ordering a Duff Hour pint at Three Needs', 'Ordering a pint'],
  ["Singing in the Vermont Green FC supporters' section", 'Cheering at a soccer game'],
  ['Playing stick-and-puck at Leddy Arena', 'Playing ice hockey'],
  ['Fat-biking at Catamount', 'Biking through snow'],
  ['Foraging ramps in May', 'Foraging for wild greens'],
  ['Eating a cider donut warm from the fryer', 'Eating a warm cider doughnut'],
  ['Reading in the corner at Muddy Waters', 'Reading at a coffee shop'],
  ['Playing pinball at the Pinball Co-op', 'Playing pinball'],
  ['Candlepin bowling in a church basement', 'Candlepin bowling'],
  ['Blowing glass at AO Glass', 'Blowing glass'],
  ['Doing 7 AM yoga on the floating dock', 'Doing yoga on a dock'],
  ['Cold plunging into Lake Champlain after the sauna', 'Taking a cold plunge'],
  ['Tubing down the river with Umiak', 'Tubing down a river'],
  ['Watching a drive-in movie with the radio on', 'Watching a drive-in movie'],
  ['Digging through the crates at Burlington Records', 'Shopping for vinyl records'],
  ['Riding the gondola up Mount Mansfield', 'Riding a mountain gondola'],
  ["Hiking Camel's Hump at dawn", 'Hiking at sunrise'],
  ["Driving the hairpins through Smugglers' Notch", 'Driving on a winding road'],
  ['Cheering at the Gut for UVM hockey', 'Cheering at a hockey game'],
  ['Eating a hot dog at a Lake Monsters game', 'Eating a hot dog at a ballgame'],
  ['Sailing on the Whistling Man schooner in a sweater', 'Sailing on the lake'],
  ['Watching the sunset from the Spirit of Ethan Allen', 'Taking a sunset boat ride'],
  ['Spotting a moose on a city street', 'Spotting a moose'],
  ['Watching the river of crows come in', 'Watching a flock of crows'],
  ['Stacking pancake ice at Leddy Beach', 'Stacking ice on the beach'],
  ['Shopping the Burton sample sale', 'Shopping for snowboards'],
  ['Picking up litter on Green Up Day', 'Picking up litter'],
  ['Eating sugar on snow at a sugarhouse', 'Eating sugar on snow'],
  ['Walking into the Donahue Sea Caves over the ice', 'Exploring an ice cave'],
  ['Setting up a lawn chair at Camp Meade', 'Unfolding a lawn chair'],
  ["Counting the drawers on the World's Tallest Filing Cabinet", 'Counting filing cabinet drawers'],
  ['Getting lost in Five Corners Antiques', 'Browsing an antique shop'],
  ['Playing Bananagrams at The Boardroom', 'Playing Bananagrams'],
  ['Bird-watching at Delta Park', 'Bird-watching'],
  ['Lobster roll at Shanty', 'Lobster roll'], ['Pho at Pho Hong', 'Noodle soup'],
  ['Brisket at Bluebird', 'Barbecue brisket'], ['Neapolitan pizza at Verità', 'Neapolitan pizza'],
  ["Sam Mazza's raspberry cookies", 'Raspberry cookies'],
  ['Brunch at Misery Loves Co.', 'Brunch'], ['A window table at Waterworks', 'A window table'],
  ['Affogato at Scout', 'Ice cream with espresso'], ['Pingala breakfast sandwich', 'Breakfast sandwich'],
  ['A best man speech that goes too long', 'A never-ending wedding speech'],
  ['A farewell cake with a misspelled name', 'Misspelling a name on a cake'],
  ['An avocado ripe for exactly six minutes', 'An overripe avocado'],
  ['A fitted sheet folding rebellion', 'Folding a fitted sheet'],
  ['A self-checkout unexpected item', 'A self-checkout error'],
  ['A streaming cliffhanger during an outage', 'Losing internet during a movie'],
  ['A secret identity revealed by autocorrect', 'Accidentally revealing a secret'],
  ['A superhero allergic to their costume', 'An itchy superhero costume'],
  ['An evil plan PowerPoint', 'Explaining an evil plan'],
  ['A dog waiting outside the co-op', 'A dog waiting outside a shop'],
]);
const insider = new Set(`The Other Place|Burlington City Arts|AO Glass|JP's Pub|Deli 126|Flora & Fauna|Onyx Tonics|Required Viewing|Magic bacon|Duff Hour|Mock eel|Wit's Up|Vacation IPA|The lamb sandwich|The Winooski dome|The 251 Club|EVE from WALL-E|U2 (the band)|DNA (genetic material)`.split('|'));
const localSpecialists = new Set(['towns', 'vt-icons', 'south-end', 'north-end', 'beyond-btown', 'night', 'cafe', 'arts', 'landmarks']);
const campusPlaces = /UVM|University|Champlain College|Saint Michael|Gutterson|Patrick Gym|Centennial Field|Ira Allen|Davis Center|Old Mill|Billings Library|Fleming Museum|Royall Tyler|Church Street|College Street hill|Rally the Catamount|Vermont Green|Grasse Mount|Centennial Woods|Virtue Field|Bailey\/Howe|Lakeview Hall/;

function editCard(card, deck) {
  const t = rewrites.get(card.t) || card.t;
  const d = insider.has(t) || (localSpecialists.has(deck.id) && card.d > 1) ? 3 : card.d;
  return { ...card, ...(t !== card.t ? { t, answerKey: cardKey(card), editorialNote: 'Simplified wording; original freshness key retained.' } : {}), d };
}
function dedupe(cards) {
  const prompts = new Set();
  return uniqueCards(cards).filter(card => {
    const prompt = normalize(card.t);
    if (prompts.has(prompt)) return false;
    prompts.add(prompt);
    return true;
  });
}
export function organizeDecks(raw) {
  const edited = [...raw, ...generalDecks].map(deck => ({ ...deck, cards: [
    ...deck.cards,
    ...(additions[deck.id] || '').split('|').filter(Boolean).map((t,index) => ({
      id:`${deck.id}-everyday-${index}`,t,d:index < 25 ? 1 : 2,source:'editorial:everyday-expansion-2026-09-12',
    })),
  ].map(card => editCard(card, deck)) }));
  const byId = new Map(edited.map(deck => [deck.id, deck]));
  const general = edited.filter(deck => deck.group !== 'local');
  const campus = byId.get('campus').cards;
  byId.get('school-days').cards.push(...campus.filter(card => !campusPlaces.test(card.t)));
  byId.get('pet-chaos').cards.push(...byId.get('vermont-dogs').cards);
  const local = collections.map(([id, name, blurb, members]) => ({
    ...byId.get(id), name, blurb,
    cards: dedupe([...members.flatMap(member => byId.get(member).cards), ...(id === 'church' ? campus.filter(card => campusPlaces.test(card.t)) : [])]),
  }));
  // General-interest decks lead the shelf; local content remains one filter away.
  const first = ['warmup', 'home-life', 'movies', 'act-general', 'animals', 'school-days', 'food', 'dress-up', 'road-trip', 'hobbies', 'feelings'];
  general.sort((a,b) => (first.includes(a.id) ? first.indexOf(a.id) : 100) - (first.includes(b.id) ? first.indexOf(b.id) : 100));
  return [...general.map(deck => ({...deck, cards:dedupe(deck.cards)})), ...local];
}
