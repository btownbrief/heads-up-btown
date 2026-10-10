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
  ["Ben & Jerry's (Church Street Scoop Shop)", "Ben & Jerry's"],
  ['Lake Champlain Chocolates (Factory Store)', 'Lake Champlain Chocolates'],
]);
// Second easing pass, 2026-10-10. Players reported that Familiar still asked for
// answers that were too specific to guess. Grades only: no card is removed, and
// every answer keeps its history key. A plain entry applies wherever that wording
// appears; "deck-id/Answer" applies to one source deck and wins over a plain entry.
const list = text => new Set(text.split('|').map(entry => entry.trim()).filter(Boolean));
// Exact-phrase traps, near-duplicates of an easier card, and specialist names. Hard only.
export const deepCuts = list(`
Umbrella stand|Napkin ring|Sugar bowl|Butter dish|Bread bin|Dish rack|Lint roller|Drying rack|Sewing basket|Power strip|Doorstop|Drafty window|Leaky faucet|Creaky stairs|Squeaky floorboard|Candle holder|Coat hook|Feather duster|Soap dispenser|Shoe rack
|Finding a bug in your soup|Chasing a runaway hat|Giving a bad haircut|Getting through airport security|Unpacking a suitcase
|Chalk eraser|Lunch bell|Classroom clock|campus/Catamounts|Meal plan|Laundry day|Student ID|Campus tour|Reading aloud|Being late for class|Forgetting homework|Packing a school lunch|Trading snacks|Choosing teams|Snow-day announcement|School fundraiser|College application|Open-book test|Solar system model|Paper chain|Reading corner|Book bag|Intramural sports|Office hours|Teaching assistant|Resident advisor|Midterms|Thesis|Freshman orientation|Club fair|Coffee before class|Used textbooks|The syllabus
|Bruschetta|Caprese salad|Gnocchi|Risotto|Shepherd's pie|Crème brûlée|Pho|Falafel
|Ponytail holder|Waistcoat|Graduation gown|Oven gloves|Gardening gloves|Elbow pads|Shin guards|Rain poncho|Tracksuit|Leotard|Tap shoes|Costume crown|Feather boa|Sequined jacket|Pocket square|Cufflinks|Brooch|Charm bracelet|Locket|Toe socks|Fuzzy slippers|Platform shoes|Steel-toed boots|Shoe inserts
|Brake lights|Gas pedal|Brake pedal|Handbrake|Exit sign|School crossing|Parking space|Tractor trailer|Roof box|Booster seat|Odometer|Low fuel warning|Tire pump|Roadside assistance|Emergency lights|Three-point turn|Backing into a space|Missing an exit|Reading a road atlas|Packing the trunk|Opening a car window|Counting license plates|A scenic overlook|A roadside diner|A drive-through order|A motel key|A souvenir magnet|Travel journal|Road-trip playlist|Snack bag|Travel cooler|Picnic stop|Backseat nap|Leg stretch
|Sketching|Writing poetry|Writing stories|Collecting postcards|Collecting seashells|Playing flute|Playing harmonica|Flying a model airplane|Building a model train|Walking in the park|Learning calligraphy|Arranging flowers|Growing herbs|Growing tomatoes|Planting bulbs|Repotting a plant|Restoring furniture|Making a mosaic|Printing photographs|Making a collage|Beading a necklace|Beachcombing|Geocaching|Rock collecting|Pressed flowers|An embroidery hoop|A gardening trowel|A paint palette|A tackle box|A knitting needle|Making a kite|Taking a dance class
|Pouting|Scowling|Sobbing|Gasping|Being curious|Being impatient|Being relieved|Being disappointed|Feeling homesick|Feeling grateful|Feeling guilty|Feeling hopeful|Feeling peaceful|Feeling brave|Pacing|Fidgeting|Staring into space|Doing a double take|Offering a handshake|Patting someone on the back|Having a laughing fit|Trying not to cry|Hiding behind your hands|Sulking|Gloating|Being starstruck|Feeling butterflies|Keeping a straight face|Putting on a brave face|Pretending to be shocked|Letting out a sigh|Bursting into applause
|A Lite-Brite|LimeWire|Napster|An away message|T9 texting|Snake on a Nokia|Neopets|Club Penguin|Webkinz|RuneScape|Nintendogs|A transparent landline phone|A burned CD|AOL Instant Messenger|Tony Hawk's Pro Skater
|Bingo
|A sticky keyboard|A tangled necklace|A rainy picnic|A surprise visitor|Accidentally waving back|A mysterious fridge smell|A delivery at the wrong house|An unskippable ad|A low fuel light|A wrong-way push door|A screen time report|A squeaky shopping cart|A package full of bubble wrap|A typo in your own name|A leaky travel mug|A self-checkout error|A meeting that could be an email|Replying to everyone
|A storm in a teacup|A blessing and a curse
|Biathlon|Bouldering|An offside call|A jump ball|A double play|A false start
|Tide pool|Marsh|Tundra|Savanna|Prairie
|Community|Arrested Development|30 Rock|The Good Place|Only Murders in the Building|Abbott Elementary|New Girl|The Amazing Race|Adventure Time|Avatar: The Last Airbender|The Bear
|Sheryl Crow|No Doubt|Missy Elliott
|Miss Trunchbull|Matilda|Mirabel Madrigal|Edna Mode|Frozone|Remy|Dr. Watson
|Carcassonne|Pandemic|Dixit|Azul|Wingspan|Sushi Go!|Stratego|Mancala|Magic: The Gathering|Stardew Valley|Crash Bandicoot|Spyro the Dragon|Kirby|Codenames|Ticket to Ride|Backgammon
|The Sagrada Família|The Grand Canal|The Blue Lagoon|Zion National Park|The Suez Canal|The Acropolis|The Burj Khalifa
|A double helix|An electron|A proton|A neutron|Penicillin|An antibiotic|A sonic boom|A pulley|A lever|Inertia|Momentum|Buoyancy|Centrifugal force
|A sufganiyah|A kinara|A lantern festival|A masquerade|A cookie exchange|A red envelope
|Wedding shoes|Wedding suit|Wedding band|Wedding venue|Wedding video|Wedding album|Wedding rehearsal|Wedding guests|Table number|Place card|Cake knife|A dance-floor circle|A tearful speech|A cake tasting|Wedding flowers|Wedding arch|Wedding favors|Matching outfits|Pinning a flower|Signing the guest book|Decorating the getaway car|Taking group photos|Packing for a honeymoon|Throwing confetti|Tying a bow tie|Catching the bouquet
|Airplane aisle|Airplane blanket|Airplane headphones|Seat pocket|Baggage cart|Luggage scale|Suitcase handle|Suitcase wheels|Security tray|Arrival gate|Departure lounge|A boarding group|Information desk|Taxi stand|Round-trip ticket|One-way ticket|Waving at arrivals|Watching planes take off|A carry-on that won’t fit|A gate change
|Binder clip|Noticeboard|Ring binder|Correction tape|Printer paper|Desk drawer|Desk calendar|A birthday card envelope|A conference room booking|A calendar invitation|A video-call background|A break-room fridge|Office staircase|Office elevator|Office kitchen|Telephone conference|Email signature|Lunch meeting|A desk plant
|Slotted spoon|Serving spoon|Cake tin|Roasting pan|Casserole dish|Lemon squeezer|Bread knife|Kitchen scissors|Soup pot|Measuring spoon|Piping bag|Zesting a lemon|Caramelizing onions|Poaching an egg|A double boiler|A pastry brush|A springform pan|A pizza stone|A garlic press|Lunch container|Baking paper|Water pitcher|Pot holder|Kitchen apron
|Super jump|Magnetic hands|Sticky fingers|Wall crawling|A superhero symbol|A secret tunnel|A hidden doorway|An underground base|A magic amulet|A power potion|Laser eyes|Super hearing|A villain monologue|An origin story|A flying motorcycle|A falling building|Catching a falling person|Outrunning a rocket|Lifting a car|Stopping a runaway train|Saving a kitten|A rescue mission|A freeze ray|A robot sidekick
|Rocket fuel|Rocket engine|Meteorite|Lunar crater|A lunar module|A space capsule|A rocket booster|A comet’s tail|Moon rock|Sleeping in space|Floating in space|Looking through a telescope|Finding an alien|Building a rocket|A robot explorer|An alien planet|A star chart
|Aquarium plants|Hamster tunnel|Bird perch|Cat basket|Cat litter|A tennis ball in a puddle|A leash tangle|A dog stealing a mitten|A dog in a canoe|A muddy car seat|A dog on the bike path|A dog in a raincoat|A puppy in snow|A parrot copying a ringtone|A fish hiding in a castle|A guinea pig squeaking|A rabbit chewing a cable|A cat refusing a carrier|A dog meeting a vacuum|Clipping a leash|Naming a puppy|Petting a rabbit|Filling a bird feeder|A dog backpack|Paw wax|A trail dog waiting ahead|A dog at the brewery|A frozen water bowl|A dog refusing the rain|A poop bag in every pocket|A dog blocking a yoga mat|A dog in a bike trailer|A trailhead meet-and-greet|A dog wearing booties|A dog watching squirrels|A cat in the laundry basket
|Saw blade|Wood screw|Wall plug|Paint tray|Paint scraper|Wallpaper paste|Wallpaper roller|Ear defenders|Extension ladder|Tool bag|Tool chest|Spirit level|Socket wrench|Stud finder|Caulk gun|Wire stripper|C-clamp|Bolt cutter|Sawhorse|Sanding block|Garden fork|Claw hammer|Pipe wrench
|A fairy princess|A royal ball|Sleeping princess|A castle tower|A fairy-tale giant|A glass castle|An enchanted garden|A fairy village|A talking teapot|A treasure cave|A knight’s sword|A dragon’s egg|A friendly giant|A secret door|A happily-ever-after ending|A book of spells|A fire-breathing dragon
|Losing your place in a book|Leaving a window open in rain|Putting salt in your coffee|Forgetting your glasses|Leaving the lights on|Running out of shampoo|An empty toothpaste tube|A suitcase wheel breaking|A sneeze while holding soup|A birthday candle that won’t go out|A chair squeaking in a quiet room|A shirt inside out all day|A sock sliding into your shoe|A squealing shopping cart|A wet newspaper|A torn shopping list|An upside-down photo|A forgotten shopping bag|A dying flashlight|A leaking water bottle|A shopping bag tearing|A vending machine stealing your snack|A shoelace coming undone
|Farmhouse Tap & Grill|Leunig's Bistro|The Friendly Toast|Gravy fries|Pine Street (South End Shopping)|Pho Hong|Taco Gordo|Beansie's Bus|Four Quarters Brewing|Sam Mazza's Farm Market|Village Scoop|The Monkey House|Sneakers Bistro|Winooski Riverwalk & Falls|Winooski Falls|The Winooski Circle|University Green|Zero Gravity Craft Brewery|Burlington Beer Company|Ethan Allen Park|Leddy Beach|World's Tallest Filing Cabinet|Radio Bean
|The Unitarian Church|Frog Hollow|Phoenix Books|Crow Bookshop|Burlington Records|Honey Road|Hen of the Wood|Pizzeria Verità|Henry's Diner|Kountry Kart Deli|Ahli Baba's Kabob Shop|Gaku Ramen|A Single Pebble|Muddy Waters|August First|The Archives|Lincoln's|Red Square|Three Needs|Memorial Auditorium|Union Station|Battery Street|Sweetwaters|Ken's Pizza and Pub|Festival of Fools|The cement truck parade|Vermont Pub & Brewery|The Boardroom|Handy's Lunch|Zabby & Elf's Stone Soup|Main Street Landing Film House|Gutterson Fieldhouse|Patrick Gym|Centennial Field|Ira Allen Chapel|Davis Center|Old Mill|Billings Library|Fleming Museum|Royall Tyler Theatre|College Street hill|Rally the Catamount
|Speeder & Earl's|Burlington Bay Market & Café|Myer's Bagels|August First Bakery & Café|Foam Brewers|Switchback Brewing Co.|Stacking firewood|Snow melting|Canvas tote|A bunch of radishes|Carrots with tops|A basket of berries|Maple cream
|Sip of Sunshine|Conehead IPA|Mushroom toast|Fried halloumi|Maple-apple crepe|Kountry Kart Deli sandwich|Shy Guy Gelato|Champ's Legendary Creemees|Little Gordo|Burlington Bay creemee|Fiddlehead IPA|Switchback Ale|Deep City|Farmhouse burger|Pizza 44|Folino's|Red Hen bread|Poor House Pies|Willow's Bagels|Cafe Dim Sum|A window table|Muddy Waters coffee|Brio Coffeeworks|Trapp Family Lodge lagers|Hill Farmstead|Prohibition Pig|Leddy Beach Bites|South End Get Down|Sap tubing|A cloud of sweet steam|Maple grading|Carrying a full sap bucket|Syrup filter|sugar-season/Sugarbush|Garlic scapes|Rainbow chard|Dilly beans|Kohlrabi|A flower subscription|A busker with a fiddle|A reusable produce bag|An overflowing market bag|Maple kettle corn|Shelburne Farms cheddar
|Backyard sugaring|Maple Open House Weekend|Bolton night skiing|Cochran's|Mad River Glen|The Gut|Fiddlehead|Switchback|Knitting through the winter|Ice fishing shanties|A moose downtown
|Bolton Valley Resort|Sleeping bag zipper|A rain fly|A flashlight under your chin|The Burlington Breakwater|Perkins Pier|Burlington Bay Market|Community Sailing Center|Splash at the Boathouse|Shanty on the Shore|Texaco Beach|Rock Point|Delta Park|The Moran Frame|Burlington Surf Club|Whistling Man Schooner|Andy A-Dog Williams Skatepark|Shelburne Bay|Niquette Bay|Colchester Causeway sunset|Texaco Beach (Dog Beach)|Intervale Center|Centennial Woods Natural Area|Niquette Bay State Park|Shelburne Bay Park|Salmon Hole|Cochran's Ski Area|Smugglers' Notch (Route 108)|Leddy Park Arena (Gordon H. Paquette Ice Arena)|Petra Cliffs Climbing Center|Bolton Potholes|Catamount Outdoor Family Center|UVM Hockey at Gutterson Fieldhouse|Bristol Falls (Bartlett Falls)|A bear canister|A trail register|A blister bandage|A forgotten tent stake|A trail cairn|A sunrise summit|A trail shelter|Sunset chasing|Sand Bar State Park
|Shoveling out your car after a nor'easter|Picking apples at Shelburne Orchards|Tapping a maple tree in your backyard|Eating a maple creemee before it melts|Learning to knit for winter|Walking a shelter dog
|Catching the bike ferry|Finding a hidden bar|Dodging a juggler|Waiting at a brewery|Waiting for brunch|Waiting for free ice cream|Stacking ice on the beach|Counting filing cabinet drawers|Watching the cement truck parade|Taking the Penguin Plunge|Exploring an ice cave|Watching a flock of crows|Waiting for the bike ferry|Trying to start an outboard|Tying a dock line|Wading through lake weeds|Climbing a slippery boat ladder|Dragging a cooler across sand|Shopping for snowboards|Foraging for wild greens|Candlepin bowling|Contra dancing|Driving on a winding road|Climbing a lookout tower|Playing Bananagrams|Browsing an antique shop
|Cider press|Apple basket|Apple cider doughnut|A frost heave|A barn quilt|A frost warning|A sap line|A boiling pan|Roof rake|Boot dryer|Windshield cover|Gaiters|Base layer|Headlamp batteries|Snowbank taller than you|A scarf over your face|Ski boot buckle|Cider slushie|A foggy valley|Pumpkin carving contest|Covered bridge photo|A scenic pull-off|Mismatched hiking socks|Apple butter|A snow squall|A root cellar|A mountain in fall colors|Roadside farm stand|Leaf peeping
|Walking up College Street|Forgetting your snow brush|Ordering another coffee|Bringing your own bag|Waving at a dog|A rainy bus shelter|A reflective vest|Boot tray|Borrowed folding chairs|A thermos of cider|A stack of board games|Tractor tire|A mailbox in the snow|A hayfield|A gravel driveway|A plate of brownies|Walking uphill|A casserole dish
|Getting blown sideways on the causeway|Taking a wrong exit at the circle|Saying you will move before winter|Running into three ex-roommates|Buying one more houseplant|Walking a bike up the hill|Putting snow tires on too late|Forgetting it is mud season|Leaving with more vinyl records|Holding your coffee with mittens|Finding a free curbside couch|Recognizing the bartender|Explaining the filing cabinet|A full bike rack|Waiting for a train crossing|Walking home from Church Street|A bus transfer|A pannier bag|A ferry queue|A wet bike seat|A mudroom full of shoes|A group chat potluck list|A screen door slamming|A blanket for every guest|The friend who brings maple syrup|A stack of mismatched mugs|A thermos at the bonfire|An extra pair of slippers|An overstuffed coat rack|An old logging road|A maple-lined driveway|A covered woodpile|A hand-painted farm sign|A pasture gate|A snowmobile crossing|A washed-out culvert|A town meeting warning|A feed sack
|Homeport|Masonic Temple|Downtown Transit Center|First Unitarian Universalist|Hotel Vermont
`);
// Well-known answers that had been filed under Hard. Familiar now includes them.
export const easyWins = list(`
A boomerang|A mime|A revolving door|A whoopee cushion|A message in a bottle
|The Godfather|Groundhog Day|Cast Away|Armadillo|Puffin|Lab partner
|Wannabe|I Want It That Way|...Baby One More Time|Call Me Maybe|September
|A Super Soaker|A Capri Sun|A gel pen|A Ring Pop|A Lunchable
|A magic carpet|A gingerbread house|A glass slipper|A flying broomstick|A giant beanstalk
|A chimney sweep|A stunt double|A puppeteer|A balance beam|A grand slam|The equator|A sinkhole
|Breaking Bad|The X-Files|Pikachu|Sonic the Hedgehog|Pac-Man|Princess Peach|Bowser|Donkey Kong|Wednesday Addams|Beetlejuice
|Antarctica|Easter Island|A photo booth|A sparkler|An advent calendar|A wedding toast|A time capsule|A party favor
|Rumpelstiltskin|The Princess and the Pea|The Emperor’s New Clothes|The Pied Piper
|The von Trapps|Jay Peak|King Arthur Baking|Cabot Creamery|Darn Tough|Robert Frost|The Northeast Kingdom|Vermont Country Store
|photos/Battery Park|photos/Waterfront Park|photos/Skinny Pancake|photos/Spirit of Ethan Allen III|photos/Burlington International Airport|photos/Henry's Diner|photos/Leunig's Bistro|photos/Radio Bean|photos/World’s Tallest Filing Cabinet
`);
export function gradeCard(t, deckId, d) {
  const scoped = `${deckId}/${t}`;
  if (easyWins.has(scoped)) return Math.min(d, 2);
  if (deepCuts.has(scoped) || deepCuts.has(t)) return 3;
  return easyWins.has(t) ? Math.min(d, 2) : d;
}
const insider = new Set(`The Other Place|Burlington City Arts|AO Glass|JP's Pub|Deli 126|Flora & Fauna|Onyx Tonics|Required Viewing|Magic bacon|Duff Hour|Mock eel|Wit's Up|Vacation IPA|The lamb sandwich|The Winooski dome|The 251 Club|EVE from WALL-E|U2 (the band)|DNA (genetic material)`.split('|'));
const localSpecialists = new Set(['towns', 'vt-icons', 'south-end', 'north-end', 'beyond-btown', 'night', 'cafe', 'arts', 'landmarks']);
const campusPlaces = /UVM|University|Champlain College|Saint Michael|Gutterson|Patrick Gym|Centennial Field|Ira Allen|Davis Center|Old Mill|Billings Library|Fleming Museum|Royall Tyler|Church Street|College Street hill|Rally the Catamount|Vermont Green|Grasse Mount|Centennial Woods|Virtue Field|Bailey\/Howe|Lakeview Hall/;

function editCard(card, deck) {
  const t = rewrites.get(card.t) || card.t;
  const d = gradeCard(t, deck.id, insider.has(t) || (localSpecialists.has(deck.id) && card.d > 1) ? 3 : card.d);
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
