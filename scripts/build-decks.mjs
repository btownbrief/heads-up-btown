// Rebuild only when intentionally refreshing editorial content from the named local repos.
import fs from "node:fs";
import path from "node:path";
import { uniqueCards } from "../dist/js/engine.js";
const base = "/Users/stephendavis/btownbrief";
const read = (p) => JSON.parse(fs.readFileSync(path.join(base, p), "utf8"));
const old = read("heads-up-btown/data/decks.json").decks;
const things = read("btown-brief/data/things.json");
const places = read("dibs/data/landmarks.json").landmarks;
const photos = read("where-in-btown-levels/data/spots.json");
const decks = [];
const palette = [
  "#d9e6c5",
  "#f9d4bc",
  "#cbdfe9",
  "#e2d9ee",
  "#f5df90",
  "#dddfd3",
  "#f2ced0",
  "#c5e2d7",
];
const split = (s) =>
  s
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
function add(
  id,
  name,
  group,
  emoji,
  blurb,
  easy = "",
  medium = "",
  hard = "",
  extra = {},
) {
  const cards = [easy, medium, hard].flatMap((s, i) =>
    split(s).map((t) => ({ t, d: i + 1 })),
  );
  const deck = {
    id,
    name,
    group,
    emoji,
    blurb,
    color: palette[decks.length % palette.length],
    cards: uniqueCards(cards),
    ...extra,
  };
  deck.cards = uniqueCards(deck.cards).map((c, i) => ({
    ...c,
    id: `${id}-${i + 1}`,
  }));
  decks.push(deck);
  return deck;
}
const omit = new Set([
  "Ten votes",
  "107 miles long",
  "A Great Lake for 18 days",
  "The first 100% renewable city",
  "Vermont's smallest largest city",
  "Lumber port",
  "Battery Park gunners",
  "Shawarma Monday",
  "3 AM kabob",
]);
for (const d of old) {
  const meta = {
    church: [
      "Church Street & downtown",
      "Every brick, bookstore, and familiar corner.",
    ],
    eat: [
      "Eat your way through Btown",
      "Creemees, diner orders, and the spots you swear by.",
    ],
    vermont: [
      "Very Vermont",
      "Mud season, maple, and things flatlanders ask about.",
    ],
    act: [
      "Act like a local",
      "Silent charades. Very specific Burlington behavior.",
    ],
    lake: [
      "Lake life",
      "Beaches, boats, causeway rides, and one famous monster.",
    ],
    newcomer: [
      "New in town",
      "A warm welcome. No lifetime Vermont residency required.",
    ],
  }[d.id];
  const cards = d.cards
    .filter((c) => !omit.has(c.t))
    .map((c) => ({
      t: c.t,
      d: d.id === "newcomer" ? 1 : d.id === "act" ? 2 : 2,
      source: `heads-up-btown/data/decks.json#${c.id}`,
      originalSource: c.s,
    }));
  add(d.id, meta[0], "local", d.emoji, meta[1], "", "", "", {
    cards,
    rule: d.id === "act" ? "act" : null,
    level: d.id === "newcomer" ? "Easy" : "Mixed",
  });
}
decks[0].cover = "assets/burlington.png";
function fromThings(id, name, emoji, blurb, predicate) {
  return add(id, name, "local", emoji, blurb, "", "", "", {
    cards: things
      .filter(predicate)
      .map((c) => ({
        t: c.name,
        d: 2,
        source: `btown-brief/data/things.json#${c.id}`,
      })),
  });
}
fromThings(
  "south-end",
  "South End state of mind",
  "🎨",
  "Art Hop, Pine Street, makers, and a post-gallery pint.",
  (c) => c.neighborhood === "South End",
);
fromThings(
  "north-end",
  "North End neighbors",
  "🏡",
  "Old North End favorites meet New North End lake days.",
  (c) => /North End/.test(c.neighborhood),
);
fromThings(
  "beyond-btown",
  "Beyond Burlington",
  "🚙",
  "Winooski, Essex, Colchester, and the next town over.",
  (c) =>
    ["Winooski", "Essex / Essex Jct", "Colchester", "Williston"].includes(
      c.neighborhood,
    ),
);
fromThings(
  "cafe",
  "Coffee, carbs & creemees",
  "🥐",
  "Your regular order, your favorite counter, your sweet tooth.",
  (c) => ["Cafe & Bakery", "Sweet Treats"].includes(c.category),
);
fromThings(
  "night",
  "One more round",
  "🍻",
  "Local breweries, little music rooms, and late-night lore.",
  (c) =>
    ["Brewery & Cidery", "Bar & Nightlife", "Music Venue"].includes(c.category),
);
fromThings(
  "arts",
  "The creative city",
  "🖼️",
  "Stages, museums, makers, and the art around the corner.",
  (c) =>
    [
      "Museum",
      "Gallery & Public Art",
      "Theater & Performance",
      "Library & Bookstore",
    ].includes(c.category),
);
fromThings(
  "outside",
  "Get outside, Vermont",
  "🥾",
  "Trailheads, swimming holes, parks, and fresh-air favorites.",
  (c) =>
    [
      "Trail & Hike",
      "Park & Green Space",
      "Beach & Waterfront",
      "Scenic Spot",
      "Sports & Recreation",
    ].includes(c.category),
);
add(
  "landmarks",
  "Meet me at…",
  "local",
  "📍",
  "The parks, landmarks, and gathering spots on our local map.",
  "",
  "",
  "",
  {
    cards: places.map((c) => ({
      t: c.name,
      d: 2,
      source: "dibs/data/landmarks.json",
      originalSource: c.src,
    })),
  },
);
add(
  "towns",
  "Name that Vermont town",
  "local",
  "🗺️",
  "Little villages, ski towns, and that place your cousin lives.",
  "Burlington|Montpelier|Stowe|Winooski|Shelburne|South Burlington|Colchester|Essex Junction|Waterbury|Rutland|Bennington|Brattleboro|Middlebury|Woodstock|St. Albans|Williston|Barre|Manchester|Killington|Newport",
  "Richmond|Jericho|Underhill|Charlotte|Hinesburg|Milton|Bristol|Vergennes|Waitsfield|Warren|Morrisville|Johnson|Cambridge|Jeffersonville|Hardwick|St. Johnsbury|Lyndonville|Fairfax|Swanton|Northfield|Randolph|Bethel|Royalton|Sharon|Norwich|Hartford|Windsor|Springfield|Chester|Ludlow|Dorset|Arlington|Wilmington|Dover|Putney|Bellows Falls|Enosburg Falls|South Hero|Grand Isle|Alburgh",
  "Isle La Motte|Westford|Bolton|Huntington|Starksboro|Monkton|Ferrisburgh|Panton|Addison|Shoreham|Orwell|Brandon|Pittsford|Poultney|Castleton|Proctor|Pawlet|Craftsbury|Greensboro|Glover|Irasburg|Barton|Derby|Canaan|Island Pond|Peacham|Danville|Cabot|Marshfield|Plainfield",
);
add(
  "campus",
  "Campus creatures",
  "local",
  "🎓",
  "UVM, Champlain, and the universal college experience.",
  "UVM|Champlain College|Catamounts|Dining hall|Roommate|Final exams|Spring break|Graduation|Campus tour|Dorm room|Lecture hall|Student ID|All-nighter|Group project|Backpack|Library|Meal plan|Study group|Laundry day|Snow day",
  "Gutterson Fieldhouse|Patrick Gym|Centennial Field|Ira Allen Chapel|UVM Green|Davis Center|Old Mill|Billings Library|Fleming Museum|Royall Tyler Theatre|Church Street|College Street hill|Rally the Catamount|Vermont Green FC|Intramural sports|Office hours|Teaching assistant|Resident advisor|Midterms|Thesis|Freshman orientation|Club fair|Coffee before class|Used textbooks|The syllabus",
  "UVM Morrill Hall|UVM Williams Hall|UVM Converse Hall|Grasse Mount|Centennial Woods|Virtue Field|Bailey/Howe Library|Lakeview Hall|Senior capstone|Registrar|Course waitlist|Bursar|Pass-fail class|Academic probation|Lab partner|Blue book exam|Dissertation|Citation needed|Extension request|Room selection",
);
add(
  "only-here",
  "Only in Burlington",
  "local",
  "🤷",
  "Tiny local dramas. Big, very specific laughs.",
  "Eating a melting creemee|Spotting Champ|Shoveling your car out|Missing the bus|Shopping the farmers market|Watching the lake sunset|Wearing a flannel|Picking apples|Walking up College Street|Wearing shorts in winter|Bringing your own bag|Biking to work|Waving at a dog|Buying maple syrup|Getting caught in the rain|Watching a street performer|Cheering for the Catamounts|Finding a parking spot|Forgetting your snow brush|Ordering another coffee",
  "Explaining what a creemee is|Getting blown sideways on the causeway|Waiting for the bike ferry|Finding sand in your car|Arguing about the best pizza|Trying to pronounce Winooski|Taking a wrong exit at the circle|Getting your boot stuck in mud|Saying you will move before winter|Running into three ex-roommates|Buying one more houseplant|Walking a bike up the hill|Wearing hiking boots to dinner|Missing the last ferry|Defending real maple syrup|Waiting for a table at brunch|Carrying skis onto a bus|Putting snow tires on too late|Forgetting it is mud season|Leaving with more vinyl records|Photographing every sunset|Holding your coffee with mittens|Finding a free curbside couch|Recognizing the bartender|Explaining the filing cabinet",
  "Hiding from someone at the co-op|Finding the door to a speakeasy|Pretending the lake is warm|Calling every mountain a short hike|Apologizing to a tree|Shaking snow out of your hood|Losing your car under snow|Explaining why you own four coats|Taking the scenic route accidentally|Buying concert tickets in a snowstorm|Misjudging the wind at the waterfront|Brushing snow off your bicycle|Meeting someone at the wrong park|Finding maple syrup in your backpack|Deciding it is finally porch weather",
);
add(
  "seasons",
  "The five Vermont seasons",
  "local",
  "🍁",
  "Summer, fall, winter, spring… and definitely mud.",
  "Maple syrup|Fall foliage|A snowstorm|A covered bridge|A moose|A black bear|A sugar maple|Apple cider|A pumpkin patch|A snowman|A bonfire|A ski lift|Snowshoes|A canoe|A kayak|A swimming hole|A wool hat|A flannel shirt|A campfire|A cider donut|A sled|A snow shovel|A scarf|A pine tree|A hiking boot",
  "Mud season|Stick season|Sugaring|A sugarhouse|Sap buckets|Snow tires|A snowplow|A woodstove|A leaf peeper|Green Up Day|Sugar on snow|A frost heave|A potluck|A farm stand|A root cellar|A maple candy|A snow squall|An ice fishing shanty|A screened porch|A barn quilt|A frost warning|A sap line|A boiling pan|A trail register|A deer crossing",
  "A sugarbush|Boiling sap|A logging road|A class four road|A mudroom|A cord of firewood|A frost pocket|A sugaring arch|Black fly season|A tick check|A tree well|An ice dam|A maple tap|A snow stake|A stone wall|A beaver dam|A fiddlehead fern|A morel mushroom|A rain barrel|A hay bale",
);
add(
  "vt-icons",
  "Vermont icons & oddities",
  "local",
  "🧤",
  "Familiar faces, homegrown names, and some excellent quirks.",
  "Bernie Sanders|Ben & Jerry's|Phish|Champ|Burton Snowboards|Vermont Teddy Bear|Noah Kahan|Ethan Allen|Grace Potter|The Green Mountains|The Long Trail|Camel's Hump|Mount Mansfield|A covered bridge|A maple leaf|A creemee|A cow|A red barn|Cheddar cheese|The Vermont State House",
  "Snowflake Bentley|The Green Mountain Boys|Ira Allen|The von Trapps|The 251 Club|Mad River Glen|Jay Peak|Sugarbush|Smugglers' Notch|Bolton Valley|Cochran's|Shelburne Museum|Shelburne Farms|The Alchemist|Hill Farmstead|The Flavor Graveyard|King Arthur Baking|Cabot Creamery|Darn Tough|Danforth Pewter|Orvis|Vermont Country Store|Simon Pearce|Vermont Flannel|Lake Willoughby",
  "Calvin Coolidge|Chester A. Arthur|Robert Frost|John Dewey|Moses Robinson|George Perkins Marsh|Justin Morrill|Fort Ticonderoga|Rokeby Museum|The Whale Tails|A round barn|The Winooski dome|The Northeast Kingdom|The Appalachian Gap|The Lincoln Gap|The Champlain Thrust|The Tunbridge Fair|Bread and Puppet Theater|The Old Red Mill|The Battle of Bennington",
);
const photoNames = new Set([
  "The Flynn",
  "Burlington City Hall",
  "BCA Center (old Firehouse)",
  "Fletcher Free Library",
  "Memorial Auditorium",
  "Henry's Diner",
  "Ben & Jerry's",
  "Leunig's Bistro",
  "Homeport",
  "First Unitarian Universalist",
  "Masonic Temple",
  "Radio Bean",
  "The Other Place",
  "Hotel Vermont",
  "Downtown Transit Center",
  "The Nest (CityPlace)",
  "Edmunds School",
  "Union Station",
  "Main Street Landing",
  "Skinny Pancake",
  "Spirit of Ethan Allen III",
  "Battery Park",
  "Chief Grey Lock statue",
  "Waterfront Park",
  "Ethan Allen Homestead",
  "UVM Old Mill",
  "Ira Allen Chapel",
  "UVM Davis Center",
  "Royall Tyler Theatre",
  "Gutterson Fieldhouse",
  "World’s Tallest Filing Cabinet",
  "Oakledge Treehouse",
  "Lakeside neighborhood",
  "Burlington International Airport",
  "South Burlington City Hall",
  "Welcome to Winooski",
  "Porter Screen Mill",
  "Winooski Falls Way",
]);
fs.mkdirSync("dist/assets/photos", { recursive: true });
const photoCards = photos
  .filter((p) => photoNames.has(p.name))
  .map((p, i) => {
    const dest = "assets/photos/" + path.basename(p.file);
    fs.copyFileSync(
      path.join(base, "where-in-btown-levels", p.file),
      path.join("dist", dest),
    );
    return {
      t: p.name,
      d: i < 15 ? 2 : 3,
      image: dest,
      credit: { author: p.author, license: p.license, url: p.sourceUrl },
      source: "where-in-btown-levels/data/spots.json",
    };
  });
add(
  "photos",
  "Btown, in pictures",
  "local",
  "📸",
  "Real local photos. Describe the scene on the screen.",
  "",
  "",
  "",
  { cards: photoCards, cover: photoCards[0].image, photo: true },
);

add(
  "warmup",
  "The icebreaker",
  "party",
  "🧊",
  "Familiar things. Easy clues. A very good place to start.",
  "Pizza|A dog|A cat|A bicycle|A birthday cake|A toothbrush|A fire engine|A banana|A rainbow|A snowman|A beach|A robot|A pirate|A dinosaur|A superhero|A popcorn bucket|A telephone|A suitcase|A cowboy|An astronaut|A campfire|An umbrella|A guitar|A sandwich|A goldfish|A roller coaster|A teddy bear|An ice cream cone|A school bus|A hot-air balloon|A coffee mug|A traffic light|A kite|A camera|A rocket ship|A pumpkin|A penguin|A chef|A wizard|A baby",
  "A time machine|A secret handshake|A karaoke machine|A hammock|A treasure map|A walkie-talkie|A fortune cookie|A disco ball|A snow globe|A claw machine|A rubber duck|A shopping cart|A lava lamp|A cheese grater|A bubble bath|A trampoline|A magic wand|A fortune teller|A wishing well|A food fight|A pillow fort|A sleepwalker|A lost sock|A theme park|A surprise party",
  "A Rube Goldberg machine|A message in a bottle|A ventriloquist|A revolving door|A boomerang|A mime|A whoopee cushion|A sand timer|A kaleidoscope|A phonograph",
);
add(
  "act-general",
  "Act it out",
  "party",
  "🎭",
  "Put the words away. Your eyebrows can do the talking.",
  "Brushing your teeth|Walking a dog|Riding a bicycle|Making a sandwich|Swimming|Flying a kite|Playing guitar|Taking a selfie|Blowing out candles|Crying|Laughing|Sleeping|Sneezing|Washing dishes|Opening a present|Driving a car|Playing basketball|Fishing|Painting a wall|Eating spaghetti|Shoveling snow|Climbing a ladder|Taking a shower|Lifting weights|Reading a book",
  "Walking into a spider web|Stepping on a Lego|Carrying too many grocery bags|Parallel parking|Doing karaoke|Finding a bug in your soup|Trying to stay awake|Walking on hot sand|Unpacking a suitcase|Chasing a runaway hat|Rock climbing|Walking in high heels|Opening a stuck jar|Trying to swat a fly|Giving a bad haircut|Training a puppy|Getting through airport security|Riding a mechanical bull|Conducting an orchestra|Putting up a tent|Being a referee|Playing air guitar|Losing your keys|Dancing in the rain|Making a snow angel",
  "Pretending to like a gift|Being stuck in an elevator|Walking against the wind|Getting an invisible haircut|Trying to fold a fitted sheet|Herding imaginary cats|Sneaking out of a meeting|Trying to be subtle|Assembling furniture without instructions|Eating something too spicy|Realizing you forgot someone's name|Trying to catch your reflection|Being a malfunctioning robot|Serving invisible tennis|Doing an underwater ballet|Escaping a sleeping bag|Apologizing without words|Walking a very stubborn dog|Trying not to laugh|Being a dramatic opera singer",
  { rule: "act" },
);
add(
  "everyday",
  "Everyday chaos",
  "party",
  "🫠",
  "The tiny disasters everyone at the table knows too well.",
  "A dead phone battery|A paper cut|A traffic jam|A burned pizza|A broken umbrella|A flat tire|A lost wallet|A cold cup of coffee|A parking ticket|A crying baby|A surprise visitor|A grocery list|A wet dog|A spilled drink|A missed bus|A mosquito bite|A tangled necklace|A squeaky door|A sticky keyboard|A rainy picnic|A snow day|A long line|A bad haircut|A forgotten password|A wrong number",
  "Replying to everyone|Accidentally waving back|A group chat|An awkward silence|Forgetting why you entered a room|Running out of toilet paper|A mysterious fridge smell|A delivery at the wrong house|An unskippable ad|A malfunctioning printer|A low fuel light|A fitted sheet|A pocket dial|A wrong-way push door|A missing puzzle piece|A screen time report|A squeaky shopping cart|A self-checkout error|A package full of bubble wrap|A sock lost in the dryer|A meeting that could be an email|A song stuck in your head|A typo in your own name|A burnt tongue|A leaky travel mug",
  "Accidental eye contact|A double-booked calendar|Autocorrect betrayal|An unsolicited software update|An existential crisis in a supermarket|A passive-aggressive sticky note|A 3 a.m. online purchase|A forgotten subscription|Talking while on mute|A video call freeze|An expired coupon|A neighbor's leaf blower|A mystery cable drawer|An automatic door that ignores you|A delayed laugh",
);
add(
  "jobs",
  "Who am I, again?",
  "party",
  "🧑‍🚀",
  "Big personalities, day jobs, and people you meet everywhere.",
  "A firefighter|A teacher|A nurse|A doctor|A chef|A farmer|A dentist|A police officer|A mail carrier|A bus driver|A painter|A singer|An actor|A dancer|A pilot|An astronaut|A lifeguard|A plumber|A mechanic|A baker|A librarian|A barber|A gardener|A waiter|A coach",
  "A magician|A detective|A judge|A lawyer|A scientist|A journalist|A photographer|A zookeeper|A park ranger|A carpenter|A sculptor|A fashion designer|A referee|A tour guide|A wedding planner|A personal trainer|A veterinarian|A DJ|A flight attendant|An archaeologist|A beekeeper|A blacksmith|A locksmith|A translator|A florist",
  "A meteorologist|A sommelier|A stunt double|A puppeteer|A foley artist|An auctioneer|A court stenographer|A cryptographer|A cartographer|A volcanologist|A perfumer|A professional organizer|A luthier|A conservator|A taxidermist|An actuary|A chimney sweep|A mortician|A voice actor|A crossword constructor",
);
add(
  "sayings",
  "You know the saying",
  "party",
  "💬",
  "Literal clues to very nonliteral expressions.",
  "Break a leg|Piece of cake|Raining cats and dogs|Spill the beans|Hit the road|A fish out of water|On cloud nine|A couch potato|Time flies|The early bird gets the worm|Better late than never|Once in a blue moon|A blessing in disguise|Under the weather|Let the cat out of the bag|A wild goose chase|All ears|A sweet tooth|A busy bee|A night owl",
  "Bite the bullet|The elephant in the room|Burning the midnight oil|A needle in a haystack|Barking up the wrong tree|A chip on your shoulder|Cutting corners|The ball is in your court|Walking on eggshells|A storm in a teacup|Putting all your eggs in one basket|A blessing and a curse|A diamond in the rough|The last straw|The best of both worlds|Throw in the towel|A shot in the dark|A broken record|A penny for your thoughts|Two peas in a pod|When pigs fly|In hot water|An open book|A silver lining|The tip of the iceberg",
  "Burning your bridges|The writing on the wall|A fly in the ointment|Throwing caution to the wind|Burying the hatchet|A double-edged sword|Pulling the wool over someone's eyes|A wolf in sheep's clothing|A can of worms|A red herring|A tough nut to crack|The pot calling the kettle black|A watched pot never boils|The whole nine yards|The apple of your eye",
);
add(
  "animals",
  "Animal instincts",
  "family",
  "🦊",
  "Fluffy, feathered, fierce. Sound effects encouraged.",
  "Dog|Cat|Elephant|Giraffe|Lion|Tiger|Monkey|Gorilla|Penguin|Polar bear|Panda|Zebra|Horse|Cow|Pig|Sheep|Goat|Chicken|Duck|Goose|Rabbit|Mouse|Dolphin|Shark|Whale|Octopus|Turtle|Frog|Snake|Butterfly|Bee|Ant|Spider|Ladybug|Goldfish",
  "Moose|Raccoon|Fox|Owl|Eagle|Hawk|Wolf|Beaver|Otter|Seal|Walrus|Hedgehog|Porcupine|Skunk|Squirrel|Chipmunk|Deer|Bat|Hummingbird|Peacock|Flamingo|Parrot|Toucan|Chameleon|Iguana|Crocodile|Alligator|Kangaroo|Koala|Sloth|Meerkat|Llama|Alpaca|Platypus|Lobster",
  "Axolotl|Pangolin|Narwhal|Capybara|Quokka|Okapi|Cassowary|Wombat|Tapir|Aardvark|Mantis shrimp|Puffin|Ocelot|Fennec fox|Sugar glider|Armadillo|Musk ox|Cuttlefish|Sea cucumber|Komodo dragon",
);
add(
  "food",
  "Snack attack",
  "family",
  "🍕",
  "A deliciously questionable way to decide what is for dinner.",
  "Pizza|Hamburger|French fries|Hot dog|Spaghetti|Macaroni and cheese|Grilled cheese|Chicken nuggets|Pancakes|Waffles|French toast|Scrambled eggs|Cereal|Toast|Peanut butter|Jelly|Chocolate|Ice cream|Popcorn|Pretzel|Potato chips|Donut|Cookie|Brownie|Cupcake|Apple pie|Banana split|Watermelon|Pineapple|Strawberry|Grape|Carrot|Broccoli|Mashed potatoes|Taco",
  "Sushi|Ramen|Burrito|Nachos|Guacamole|Hummus|Falafel|Curry|Dumplings|Fried rice|Spring rolls|Pad thai|Pho|Lobster roll|Clam chowder|Fish and chips|Shepherd's pie|Lasagna|Risotto|Ravioli|Gnocchi|Bruschetta|Caprese salad|Croissant|Bagel|Scone|Cinnamon roll|Tiramisu|Cheesecake|Crème brûlée",
  "Bánh mì|Bibimbap|Shakshuka|Pierogi|Poutine|Arepa|Empanada|Baklava|Mochi|Kimchi|Baba ganoush|Gyoza|Bao bun|Ceviche|Gazpacho|Paella|Ratatouille|Boeuf bourguignon|Pavlova|Beef Wellington",
);
add(
  "kids",
  "Little legends",
  "family",
  "🦄",
  "Friendly favorites for younger guessers and their grown-ups.",
  "Unicorn|Dragon|Mermaid|Fairy|Princess|Knight|Castle|Pirate ship|Treasure chest|Magic wand|Robot|Spaceship|Dinosaur|Teddy bear|Playground|Slide|Swing|Seesaw|Sandbox|Crayon|Paintbrush|Bubbles|Balloon|Birthday party|Present|Cupcake|Ice cream truck|School bus|Backpack|Lunchbox|Rain boots|Pajamas|Blanket|Pillow|Snowman|Rainbow|Moon|Sun|Star|Cloud",
  "Paw Patrol|Bluey|Bingo|Peppa Pig|Dora the Explorer|Elmo|Cookie Monster|Big Bird|Oscar the Grouch|SpongeBob SquarePants|Patrick Star|Mickey Mouse|Minnie Mouse|Donald Duck|Goofy|Winnie the Pooh|Tigger|Eeyore|Peter Pan|Tinker Bell|Cinderella|Sleeping Beauty|Snow White|Little Red Riding Hood|The Three Little Pigs",
  "A talking mirror|A magic carpet|A gingerbread house|A glass slipper|A golden ticket|A secret passage|An enchanted forest|A wishing well|A flying broomstick|A giant beanstalk",
);
add(
  "sport",
  "Good sport",
  "family",
  "🏓",
  "Stadiums optional. Competitive friends very much included.",
  "Soccer|Basketball|Baseball|Football|Hockey|Tennis|Golf|Swimming|Skiing|Snowboarding|Running|Cycling|Skateboarding|Bowling|Volleyball|Gymnastics|Boxing|Wrestling|Surfing|Skating|A home run|A touchdown|A goal|A slam dunk|A referee|A scoreboard|A trophy|A medal|A helmet|A whistle",
  "Pickleball|Badminton|Table tennis|Lacrosse|Rugby|Cricket|Water polo|Fencing|Archery|Rowing|Sailing|Rock climbing|Bouldering|Disc golf|Ultimate frisbee|Curling|Biathlon|Triathlon|Marathon|A penalty kick|An offside call|A free throw|A hat trick|A double play|A relay race|A photo finish|A hole in one|A false start|A tiebreaker|A jump ball",
  "A triple axel|A bicycle kick|A Hail Mary|A perfect game|A grand slam|An alley-oop|A pick and roll|A knuckleball|A full nelson|A split decision|A decathlon|A pentathlon|A steeplechase|A velodrome|A pommel horse|A balance beam|A Fosbury flop|A scissor kick|A penalty shootout|An own goal",
);
add(
  "nature",
  "Wild world",
  "family",
  "🌻",
  "The great outdoors, minus the bug spray.",
  "Mountain|River|Lake|Ocean|Waterfall|Beach|Island|Desert|Forest|Cave|Volcano|Snow|Rain|Wind|Thunder|Lightning|Rainbow|Sunrise|Sunset|Moon|Star|Cloud|Flower|Tree|Leaf|Pinecone|Acorn|Mushroom|Cactus|Seashell",
  "Glacier|Iceberg|Canyon|Valley|Cliff|Coral reef|Tide pool|Sand dune|Marsh|Swamp|Prairie|Meadow|Rainforest|Tundra|Savanna|Hot spring|Geyser|Avalanche|Tornado|Hurricane|Earthquake|Drought|Eclipse|Meteor shower|Northern lights|Constellation|Milky Way|Solar system|Black hole|Comet",
  "Bioluminescence|Photosynthesis|Continental drift|Plate tectonics|A watershed|An estuary|A stalactite|A stalagmite|An archipelago|A fjord|Permafrost|The equator|The solstice|The equinox|A supernova|A nebula|A neutron star|A solar flare|A sinkhole|A caldera",
);
add(
  "movies",
  "Movie night",
  "pop",
  "🍿",
  "Big-screen favorites, quotable classics, and one more sequel.",
  "Titanic|Jaws|Jurassic Park|Star Wars|Harry Potter|The Lion King|Frozen|Toy Story|Shrek|Finding Nemo|The Wizard of Oz|The Little Mermaid|Aladdin|Beauty and the Beast|Home Alone|The Grinch|Elf|Ghostbusters|Back to the Future|E.T.|Superman|Batman|Spider-Man|The Avengers|Black Panther|Barbie|The Super Mario Bros. Movie|Inside Out|Moana|Coco",
  "The Princess Bride|The Goonies|Ferris Bueller's Day Off|The Breakfast Club|Mean Girls|Clueless|Legally Blonde|School of Rock|Pitch Perfect|Mamma Mia!|Grease|Dirty Dancing|Footloose|The Sound of Music|Mary Poppins|Willy Wonka & the Chocolate Factory|The Incredibles|Ratatouille|WALL-E|Up|Monsters, Inc.|The Karate Kid|Rocky|Top Gun|Men in Black|The Matrix|Inception|Interstellar|The Hunger Games|The Lord of the Rings",
  "Everything Everywhere All at Once|The Grand Budapest Hotel|Knives Out|Parasite|Amélie|The Truman Show|Eternal Sunshine of the Spotless Mind|The Big Lebowski|The Shawshank Redemption|The Godfather|Casablanca|Citizen Kane|Rear Window|Psycho|Vertigo|Spirited Away|Princess Mononoke|My Neighbor Totoro|The Iron Giant|The Secret of NIMH|Groundhog Day|Cast Away|O Brother, Where Art Thou?|The Fifth Element|The Muppet Christmas Carol",
);
add(
  "tv",
  "Just one more episode",
  "pop",
  "📺",
  "Comfort shows, iconic characters, and the group-chat spoilers.",
  "Friends|The Office|The Simpsons|SpongeBob SquarePants|Stranger Things|Game of Thrones|The Big Bang Theory|Seinfeld|Sesame Street|The Muppet Show|Scooby-Doo|Tom and Jerry|The Flintstones|The Jetsons|Pokémon|The Fresh Prince of Bel-Air|Full House|Modern Family|The Great British Bake Off|The Price Is Right",
  "Parks and Recreation|Brooklyn Nine-Nine|Schitt's Creek|Ted Lasso|Abbott Elementary|New Girl|Gilmore Girls|How I Met Your Mother|Community|Arrested Development|30 Rock|The Good Place|Only Murders in the Building|Wednesday|Bridgerton|The Crown|Downton Abbey|Lost|Survivor|The Amazing Race|Jeopardy!|Wheel of Fortune|Bob's Burgers|Adventure Time|Avatar: The Last Airbender|Doctor Who|Sherlock|The Mandalorian|The Last of Us|The Bear",
  "Severance|Succession|The White Lotus|Better Call Saul|Breaking Bad|The Sopranos|The Wire|Fleabag|Derry Girls|What We Do in the Shadows|Taskmaster|It's Always Sunny in Philadelphia|Curb Your Enthusiasm|Twin Peaks|The X-Files|Battlestar Galactica|Firefly|The West Wing|The Americans|Veep|Nathan for You|Reservation Dogs|The IT Crowd|Black Mirror|Slow Horses",
);
add(
  "music",
  "Main character music",
  "pop",
  "🎤",
  "The artists on your road-trip playlist. Air microphones ready.",
  "Taylor Swift|Beyoncé|Adele|Bruno Mars|Lady Gaga|Rihanna|Elton John|Michael Jackson|Madonna|Elvis Presley|The Beatles|Queen|ABBA|Dolly Parton|Whitney Houston|Mariah Carey|Céline Dion|Ed Sheeran|Billie Eilish|Harry Styles|Justin Bieber|Katy Perry|Ariana Grande|Miley Cyrus|Olivia Rodrigo",
  "Stevie Wonder|Prince|David Bowie|Fleetwood Mac|The Rolling Stones|Bruce Springsteen|Billy Joel|Tina Turner|Cher|Cyndi Lauper|Shania Twain|Garth Brooks|Willie Nelson|Johnny Cash|Sheryl Crow|Alanis Morissette|Gwen Stefani|No Doubt|Green Day|Blink-182|Nirvana|Foo Fighters|Coldplay|U2|Oasis|Backstreet Boys|NSYNC|Spice Girls|Destiny's Child|Outkast|Missy Elliott|Lizzo|Chappell Roan|Sabrina Carpenter|Noah Kahan",
  "Hozier|Florence + the Machine|Lana Del Rey|Sufjan Stevens|Bon Iver|Mitski|Phoebe Bridgers|Boygenius|Vampire Weekend|Arctic Monkeys|Tame Impala|Gorillaz|Daft Punk|LCD Soundsystem|Talking Heads|The Cure|The Smiths|Depeche Mode|Radiohead|Björk|Joni Mitchell|Carole King|Patti Smith|Lou Reed|Leonard Cohen",
);
add(
  "songs",
  "Hum along",
  "pop",
  "🎶",
  "Hum the melody. No lyrics, no titles, maximum confidence.",
  "Happy Birthday|Twinkle, Twinkle, Little Star|Jingle Bells|The Wheels on the Bus|Old MacDonald Had a Farm|Row, Row, Row Your Boat|Mary Had a Little Lamb|Baby Shark|Let It Go|Hakuna Matata|You've Got a Friend in Me|We Will Rock You|We Are the Champions|Dancing Queen|Sweet Caroline|YMCA|Happy|Shake It Off|Uptown Funk|Can't Stop the Feeling!",
  "Bohemian Rhapsody|Don't Stop Believin'|Livin' on a Prayer|I Wanna Dance with Somebody|Girls Just Want to Have Fun|Take On Me|Africa|Never Gonna Give You Up|Sweet Dreams (Are Made of This)|Wake Me Up Before You Go-Go|Billie Jean|Thriller|Beat It|Like a Prayer|Material Girl|Take Me Home, Country Roads|Jolene|9 to 5|Ring of Fire|I Will Always Love You|Piano Man|Tiny Dancer|Rocket Man|Your Song|Hey Jude|Let It Be|Here Comes the Sun|Yellow Submarine|Imagine|Stand by Me",
  "Mr. Brightside|Somebody That I Used to Know|Rolling in the Deep|Someone Like You|Call Me Maybe|Party in the U.S.A.|Since U Been Gone|I Want It That Way|Wannabe|No Scrubs|Toxic|...Baby One More Time|Complicated|Wonderwall|Smells Like Teen Spirit|Seven Nation Army|Feel Good Inc.|Hey Ya!|Viva la Vida|Clocks|Hot to Go!|Espresso|Stick Season|Take Me to Church|September",
  { rule: "hum" },
);
add(
  "characters",
  "Fictional friends",
  "pop",
  "🦸",
  "Heroes, villains, and someone who definitely needs a nap.",
  "Harry Potter|Hermione Granger|Ron Weasley|Dumbledore|Voldemort|Darth Vader|Luke Skywalker|Princess Leia|Yoda|Chewbacca|R2-D2|C-3PO|Batman|Superman|Wonder Woman|Spider-Man|Iron Man|Captain America|The Hulk|Thor|Black Panther|Elsa|Anna|Olaf|Shrek|Donkey|Woody|Buzz Lightyear|Nemo|Dory",
  "Jack Sparrow|Indiana Jones|James Bond|Sherlock Holmes|Dr. Watson|Mary Poppins|Willy Wonka|Matilda|Miss Trunchbull|Paddington Bear|Peter Rabbit|Simba|Mufasa|Scar|Timon|Pumbaa|Ariel|Ursula|Belle|Gaston|Mulan|Stitch|Moana|Maui|Mirabel Madrigal|Edna Mode|Frozone|Remy|WALL-E|EVE|Gandalf|Frodo Baggins|Gollum|Bilbo Baggins|Legolas",
  "Wednesday Addams|Morticia Addams|Uncle Fester|Beetlejuice|Edward Scissorhands|Jack Skellington|Coraline|Totoro|Kiki|Ponyo|Chihiro|Sailor Moon|Pikachu|Ash Ketchum|Team Rocket|Sonic the Hedgehog|Princess Peach|Bowser|Donkey Kong|Kirby|Link|Princess Zelda|Lara Croft|Pac-Man|Ms. Frizzle",
);
add(
  "nineties",
  "90s & 00s kids",
  "pop",
  "📼",
  "Be kind, rewind. The nostalgia is extremely real.",
  "A Game Boy|A Tamagotchi|A Furby|A Beanie Baby|A Pokémon card|A cassette tape|A CD player|A VHS tape|A flip phone|A disposable camera|A lava lamp|A slap bracelet|A scrunchie|A mood ring|Rollerblades|A scooter|A water gun|A yo-yo|A Rubik's Cube|A Slinky|A Lite-Brite|A Magic 8 Ball|A Polly Pocket|A Hot Wheels car|A Lego set",
  "Blockbuster|Dial-up internet|AOL Instant Messenger|MySpace|Napster|LimeWire|A burned CD|A mixtape|An away message|An iPod|A Walkman|A Discman|A floppy disk|A transparent landline phone|T9 texting|Snake on a Nokia|Minesweeper|Solitaire|The Oregon Trail|Neopets|Club Penguin|Webkinz|RuneScape|The Sims|Nintendogs|Wii Sports|Guitar Hero|Dance Dance Revolution|Mario Kart|Tony Hawk's Pro Skater",
  "An overhead projector|A Trapper Keeper|A gel pen|A Lisa Frank folder|A pencil grip|A Lunchable|Dunkaroos|Gushers|Fruit by the Foot|A Ring Pop|A Push Pop|A Capri Sun|A Book Fair|A Scholastic catalog|A Pizza Hut reading reward|A chain email|A ringtone purchase|A screensaver maze|A portable DVD player|A Super Soaker|Pogs|A Bop It|A Skip-It|A Tech Deck|A DVD menu",
);
add(
  "games",
  "Game on",
  "pop",
  "🎮",
  "Board-game betrayal and video-game victory dances.",
  "Monopoly|Uno|Scrabble|Chess|Checkers|Jenga|Connect Four|Guess Who?|Clue|Candy Land|Chutes and Ladders|Sorry!|Operation|Twister|Battleship|Pictionary|Charades|Hide and seek|Tag|Rock paper scissors|Minecraft|Mario Kart|Pokémon|Tetris|Pac-Man|Super Mario Bros.|Animal Crossing|Wii Sports|Just Dance|Roblox",
  "Catan|Ticket to Ride|Carcassonne|Pandemic|Codenames|Dixit|Azul|Wingspan|Sushi Go!|Exploding Kittens|Bananagrams|Boggle|Taboo|Scattergories|Trivial Pursuit|Risk|Stratego|Mancala|Backgammon|Cribbage|Dungeons & Dragons|Magic: The Gathering|Stardew Valley|The Sims|Zelda|Sonic the Hedgehog|Donkey Kong|Kirby|Crash Bandicoot|Spyro the Dragon",
  "Hollow Knight|Hades|Celeste|Portal|Undertale|Outer Wilds|Disco Elysium|Balatro|Slay the Spire|Return of the Obra Dinn|Spirit Island|Root|Gloomhaven|Betrayal at House on the Hill|The Resistance|Secret Hitler|Blood on the Clocktower|7 Wonders|Splendor|The Crew",
);
add(
  "travel",
  "Out of office",
  "family",
  "🧳",
  "Big landmarks and little travel adventures.",
  "The Eiffel Tower|The Statue of Liberty|The Great Wall of China|The pyramids|The Grand Canyon|Niagara Falls|Mount Everest|The Golden Gate Bridge|Big Ben|The Leaning Tower of Pisa|The Colosseum|The Taj Mahal|The Sydney Opera House|Disneyland|The Hollywood Sign|The North Pole|The South Pole|The Amazon rainforest|The Sahara Desert|The Great Barrier Reef",
  "Machu Picchu|Stonehenge|Mount Rushmore|The Space Needle|The Empire State Building|The Burj Khalifa|The Louvre|The Acropolis|The Sagrada Família|Christ the Redeemer|The Las Vegas Strip|Times Square|Central Park|The London Eye|The Grand Canal|The Blue Lagoon|Yellowstone|Yosemite|Zion National Park|The Rocky Mountains|The Alps|Mount Fuji|The Dead Sea|The Panama Canal|The Suez Canal|A passport|A boarding pass|A baggage carousel|A hostel|A cruise ship",
  "Petra|Angkor Wat|Chichén Itzá|Easter Island|The Galápagos Islands|The Serengeti|Victoria Falls|Table Mountain|Uluru|The Dolomites|The Amalfi Coast|Cinque Terre|The Alhambra|Mont Saint-Michel|The Giant's Causeway|The Ring of Kerry|The Scottish Highlands|The Faroe Islands|Svalbard|Antarctica",
);
add(
  "science",
  "Brainy bunch",
  "party",
  "🧪",
  "For the table that cannot resist explaining how things work.",
  "Gravity|A magnet|An atom|A microscope|A telescope|A volcano|A dinosaur fossil|A robot|A rocket|A satellite|The solar system|Mars|Saturn|Jupiter|The Milky Way|A black hole|Electricity|A battery|A solar panel|A wind turbine|A thermometer|A compass|A light bulb|A circuit|An experiment",
  "Photosynthesis|Evolution|DNA|A double helix|A chemical reaction|The periodic table|An electron|A proton|A neutron|A molecule|A cell|Bacteria|A virus|An antibiotic|A vaccine|Penicillin|A prism|A laser|An optical illusion|A sonic boom|A sound wave|An echo|A pendulum|A pulley|A lever|Friction|Inertia|Momentum|Buoyancy|Centrifugal force",
  "Quantum entanglement|Schrödinger's cat|Heisenberg's uncertainty principle|General relativity|Entropy|The placebo effect|Confirmation bias|The Doppler effect|The greenhouse effect|Plate tectonics|Carbon dating|Natural selection|Symbiosis|Metamorphosis|Mitosis|Meiosis|Osmosis|Capillary action|Superconductivity|Nuclear fusion",
);
add(
  "holidays",
  "Reason to celebrate",
  "family",
  "🎉",
  "Festive traditions, party moments, and seasonal silliness.",
  "Birthday cake|Birthday candles|Balloons|Confetti|A party hat|A piñata|A present|Wrapping paper|A Christmas tree|Santa Claus|An elf|A reindeer|A stocking|A candy cane|A snow globe|A gingerbread man|A pumpkin|A jack-o'-lantern|A witch|A ghost|A vampire|A werewolf|An Easter egg|An Easter bunny|A Valentine",
  "Trick-or-treating|Carving a pumpkin|Bobbing for apples|A haunted house|A costume contest|A corn maze|A hayride|A gingerbread house|Secret Santa|An ugly sweater|A cookie exchange|A holiday card|A menorah|A dreidel|A latke|A sufganiyah|A kinara|A lantern festival|A dragon dance|A red envelope|A firework|A New Year's resolution|A midnight countdown|A parade|A masquerade",
  "A white elephant exchange|A yule log|A Christmas cracker|A wassail|A maypole|A solstice bonfire|An advent calendar|A king cake|A Mardi Gras mask|A paper fortune teller|A time capsule|A wedding toast|A bouquet toss|A baby shower game|A retirement speech|An anniversary dinner|A surprise entrance|A party favor|A photo booth|A sparkler",
);

// Hand-authored forbidden clues. Cards without a set are excluded from that rule.
const bans = {
  "Church Street": "bricks,shopping,pedestrian",
  "Church Street Marketplace": "bricks,shopping,pedestrian",
  "Lake Champlain": "water,Champ,lake",
  Champ: "monster,lake,serpent",
  "Maple syrup": "pancakes,tree,sap",
  Creemee: "ice cream,soft serve,cone",
  "Mud season": "spring,dirt,boots",
  "Stick season": "Noah Kahan,leaves,fall",
  Phish: "band,Trey,jam",
  "Bernie Sanders": "senator,mittens,politician",
  UVM: "university,college,Catamounts",
  "Ben & Jerry's": "ice cream,Ben,Jerry",
  "Camel's Hump": "mountain,hike,peak",
  "Mount Mansfield": "mountain,tallest,Stowe",
  Winooski: "circle,onion,river",
  "The Flynn": "theater,Main Street,show",
  "Waterfront Park": "lake,sunset,swings",
  "City Market": "co-op,groceries,food",
  "North Beach": "sand,swim,lake",
  "Burlington City Hall": "mayor,government,park",
  "Fletcher Free Library": "books,read,borrow",
  ECHO: "museum,science,aquarium",
  "The Intervale": "farm,river,compost",
  "A covered bridge": "wood,river,road",
  "Covered bridges": "wood,river,road",
  "A snow shovel": "snow,winter,dig",
  "The bike path": "bicycle,ride,Greenway",
  "Maple leaf": "tree,Canada,syrup",
  Cheddar: "cheese,Cabot,dairy",
  Snowboarding: "Burton,snow,board",
  Skiing: "snow,mountain,poles",
  "The Lake Monsters": "baseball,Champ,team",
  "Vermont Green FC": "soccer,team,Virtue",
  "A sugarhouse": "sap,syrup,boil",
  "Ben & Jerry's factory tour": "ice cream,Waterbury,Flavor Graveyard",
  "The farmers market": "vegetables,Saturday,stalls",
  "The Adirondacks": "mountains,New York,lake",
  "A food truck": "eat,wheels,mobile",
  "The South End": "Pine Street,Art Hop,neighborhood",
  "The Old North End": "neighborhood,North Street,community",
  "Pine Street": "South End,Art Hop,road",
  "Art Hop": "artists,South End,galleries",
  "Green Up Day": "trash,clean,green bags",
  "Sugar on snow": "maple,syrup,candy",
  "Heady Topper": "beer,Alchemist,IPA",
  "Bernie Sanders": "mittens,senator,Vermont",
  "Vermont Teddy Bear": "stuffed,toy,factory",
  "Burton Snowboards": "Jake,winter,ride",
  "Noah Kahan": "Stick Season,singer,Strafford",
  Pizza: "cheese,slice,crust",
  "A dog": "bark,pet,puppy",
  Dog: "bark,pet,puppy",
  "A cat": "meow,pet,kitten",
  Cat: "meow,pet,kitten",
  "A bicycle": "pedal,wheels,ride",
  "A birthday cake": "candles,frosting,celebrate",
  "A toothbrush": "teeth,brush,paste",
  "A banana": "yellow,fruit,peel",
  "A rainbow": "colors,rain,sky",
  "A snowman": "snow,carrot,Frosty",
  "A beach": "sand,ocean,swim",
  "A robot": "machine,metal,computer",
  "A pirate": "ship,treasure,arr",
  "A dinosaur": "extinct,Jurassic,fossil",
  "A superhero": "cape,powers,save",
  "An astronaut": "space,moon,rocket",
  "An umbrella": "rain,wet,cover",
  "A guitar": "strings,music,strum",
  "A sandwich": "bread,lunch,filling",
  "A goldfish": "fish,bowl,orange",
  "A teddy bear": "stuffed,toy,cuddle",
  "A camera": "photo,picture,lens",
  "A penguin": "bird,ice,waddle",
  Penguin: "bird,ice,waddle",
  "A chef": "cook,kitchen,food",
  "A wizard": "magic,wand,spell",
  "A baby": "cry,diaper,infant",
  Titanic: "ship,iceberg,Leonardo",
  Jaws: "shark,beach,Spielberg",
  "Jurassic Park": "dinosaurs,island,Spielberg",
  "Star Wars": "space,Jedi,Darth Vader",
  "Harry Potter": "wizard,Hogwarts,wand",
  Frozen: "Elsa,ice,Let It Go",
  Shrek: "ogre,Donkey,green",
  "Finding Nemo": "fish,clownfish,ocean",
  "Toy Story": "toys,Woody,Buzz",
  "The Lion King": "Simba,lion,Africa",
  "The Wizard of Oz": "Dorothy,yellow,Emerald City",
  "Home Alone": "Kevin,burglars,Christmas",
  Ghostbusters: "ghosts,Slimer,proton",
  "Back to the Future": "DeLorean,time,McFly",
  "E.T.": "alien,phone,home",
  Barbie: "pink,doll,Ken",
  "Inside Out": "emotions,Joy,Riley",
  Moana: "ocean,Maui,Disney",
  Coco: "guitar,dead,Miguel",
  "The Matrix": "Neo,pill,simulation",
  "The Princess Bride": "inconceivable,Westley,Buttercup",
  "The Goonies": "treasure,pirates,Chunk",
  "Mean Girls": "Regina,fetch,pink",
  "Legally Blonde": "Elle,Harvard,lawyer",
  "School of Rock": "Jack Black,band,teacher",
  "Mamma Mia!": "ABBA,wedding,Greece",
  Grease: "Danny,Sandy,musical",
  "Dirty Dancing": "Baby,corner,lift",
  "The Sound of Music": "Maria,nuns,Austria",
  "Mary Poppins": "nanny,umbrella,spoonful",
  Ratatouille: "rat,chef,Paris",
  "WALL-E": "robot,trash,space",
  Up: "balloons,house,Carl",
  "Monsters, Inc.": "scare,Sully,Mike",
  Rocky: "boxing,Stallone,Philadelphia",
  "Top Gun": "pilot,Maverick,Tom Cruise",
  "Men in Black": "aliens,suits,Will Smith",
  "The Hunger Games": "Katniss,arena,district",
  "The Lord of the Rings": "Frodo,hobbit,Gandalf",
  Inception: "dream,DiCaprio,spinning top",
  Interstellar: "space,black hole,McConaughey",
  "The Truman Show": "television,Jim Carrey,real",
  "Cast Away": "island,Wilson,Tom Hanks",
  "Groundhog Day": "repeat,Bill Murray,February",
  Friends: "Ross,Rachel,Central Perk",
  "The Office": "Dunder Mifflin,Michael Scott,Scranton",
  "The Simpsons": "Homer,Bart,Springfield",
  "Stranger Things": "Eleven,Upside Down,Demogorgon",
  Seinfeld: "Jerry,Kramer,nothing",
  "Game of Thrones": "dragons,Winterfell,Jon Snow",
  "The Great British Bake Off": "baking,tent,Paul Hollywood",
  "Parks and Recreation": "Leslie,Pawnee,Ron",
  "Brooklyn Nine-Nine": "police,Peralta,Holt",
  "Schitt's Creek": "Rose,motel,Moira",
  "Ted Lasso": "football,coach,Richmond",
  Wednesday: "Addams,school,dance",
  "The Bear": "chef,Chicago,restaurant",
  "The Good Place": "afterlife,Eleanor,Chidi",
  Lost: "island,plane,crash",
  Survivor: "island,tribe,vote",
  "Jeopardy!": "questions,answers,Alex Trebek",
  "Doctor Who": "TARDIS,time,Dalek",
  "The Mandalorian": "Grogu,Baby Yoda,bounty hunter",
  Severance: "Lumon,work,memory",
  Succession: "Roy,media,family",
  "Breaking Bad": "Walter,meth,Heisenberg",
  "Taylor Swift": "Eras,Shake It Off,Travis",
  Beyoncé: "Single Ladies,Jay-Z,Destiny's Child",
  Adele: "Hello,singer,Someone Like You",
  "Bruno Mars": "Uptown Funk,singer,Silk Sonic",
  "Lady Gaga": "Poker Face,meat dress,Born This Way",
  Rihanna: "Umbrella,Fenty,singer",
  "Elton John": "Rocket Man,piano,glasses",
  "Michael Jackson": "Thriller,moonwalk,glove",
  Madonna: "Material Girl,Like a Virgin,pop",
  "Elvis Presley": "king,Graceland,blue suede",
  "The Beatles": "Liverpool,John,Paul",
  Queen: "Freddie,Bohemian Rhapsody,rock",
  ABBA: "Sweden,Dancing Queen,Mamma Mia",
  "Dolly Parton": "Jolene,9 to 5,blonde",
  "Billie Eilish": "Bad Guy,brother,singer",
  "Harry Styles": "One Direction,Watermelon Sugar,singer",
  "Whitney Houston": "Bodyguard,I Will Always Love You,singer",
  "David Bowie": "Ziggy Stardust,Space Oddity,glam",
  Prince: "Purple Rain,Minneapolis,symbol",
  "Fleetwood Mac": "Stevie Nicks,Rumours,Dreams",
  Nirvana: "Kurt Cobain,grunge,Seattle",
  "Daft Punk": "helmets,French,Get Lucky",
  Elephant: "trunk,gray,tusks",
  Giraffe: "neck,tall,spots",
  Lion: "mane,king,roar",
  Tiger: "stripes,cat,orange",
  Zebra: "stripes,black,white",
  Horse: "ride,hooves,neigh",
  Cow: "milk,moo,farm",
  Pig: "oink,pink,bacon",
  Sheep: "wool,baa,flock",
  Chicken: "egg,cluck,farm",
  Duck: "quack,pond,bill",
  Rabbit: "bunny,ears,carrot",
  Dolphin: "ocean,swim,Flipper",
  Shark: "teeth,fin,Jaws",
  Whale: "ocean,blowhole,huge",
  Octopus: "tentacles,eight,ink",
  Turtle: "shell,slow,reptile",
  Frog: "ribbit,pond,jump",
  Snake: "slither,hiss,reptile",
  Butterfly: "wings,caterpillar,insect",
  Bee: "honey,sting,buzz",
  Spider: "web,eight,legs",
  Moose: "antlers,Vermont,large",
  Raccoon: "mask,trash,bandit",
  Owl: "hoot,night,bird",
  Beaver: "dam,teeth,wood",
  Sloth: "slow,tree,sleep",
  Platypus: "duck,bill,mammal",
  Lobster: "claws,red,Maine",
  Axolotl: "salamander,gills,Mexico",
  Narwhal: "tusk,whale,unicorn",
  Capybara: "rodent,large,chill",
  Hamburger: "beef,bun,patty",
  "French fries": "potato,fried,ketchup",
  "Hot dog": "sausage,bun,mustard",
  Spaghetti: "pasta,noodles,sauce",
  Pancakes: "breakfast,syrup,stack",
  Waffles: "breakfast,syrup,squares",
  Chocolate: "cocoa,sweet,candy",
  "Ice cream": "frozen,dairy,cone",
  Popcorn: "movie,kernels,butter",
  Donut: "hole,fried,glaze",
  Cookie: "baked,chocolate chips,crunchy",
  Sushi: "rice,fish,Japan",
  Ramen: "noodles,broth,Japan",
  Burrito: "tortilla,beans,wrap",
  Guacamole: "avocado,dip,green",
  Hummus: "chickpeas,dip,tahini",
  Falafel: "chickpeas,fried,balls",
  Curry: "spice,sauce,India",
  Dumplings: "dough,filling,steamed",
  "Pad thai": "noodles,peanuts,Thailand",
  Pho: "Vietnam,broth,noodles",
  "Lobster roll": "seafood,bun,Maine",
  Poutine: "fries,gravy,cheese curds",
  Croissant: "French,pastry,butter",
  Bagel: "hole,bread,cream cheese",
  Tiramisu: "coffee,dessert,Italy",
  Baklava: "honey,nuts,phyllo",
  Mochi: "rice,Japan,chewy",
  Kimchi: "cabbage,Korea,fermented",
  "Beef Wellington": "pastry,steak,Gordon Ramsay",
  Soccer: "ball,goal,kick",
  Basketball: "hoop,bounce,dunk",
  Baseball: "bat,diamond,home run",
  Football: "touchdown,quarterback,helmet",
  Hockey: "puck,ice,stick",
  Tennis: "racket,net,court",
  Golf: "club,hole,green",
  Swimming: "water,pool,stroke",
  Bowling: "pins,ball,lane",
  Pickleball: "paddle,court,net",
  Curling: "ice,broom,stone",
  "A home run": "baseball,bat,bases",
  "A touchdown": "football,end zone,six",
  "A hat trick": "three,goals,hockey",
  "A hole in one": "golf,ace,shot",
  Monopoly: "money,properties,Boardwalk",
  Uno: "cards,colors,reverse",
  Scrabble: "words,tiles,letters",
  Chess: "king,queen,checkmate",
  Jenga: "tower,blocks,stack",
  Clue: "murder,mystery,Colonel Mustard",
  Twister: "mat,colors,limbs",
  Battleship: "boats,grid,sunk",
  Minecraft: "blocks,Creeper,craft",
  Tetris: "blocks,lines,Russia",
  "Pac-Man": "dots,ghosts,maze",
  Catan: "settlers,sheep,trading",
  "Ticket to Ride": "trains,routes,cards",
  Codenames: "spy,words,clue",
  "Dungeons & Dragons": "dice,roleplaying,dungeon master",
  "The Eiffel Tower": "Paris,France,iron",
  "The Statue of Liberty": "New York,torch,France",
  "The Great Wall of China": "China,wall,long",
  "The Grand Canyon": "Arizona,Colorado River,rock",
  "The Taj Mahal": "India,marble,mausoleum",
  "Big Ben": "London,clock,bell",
  Stonehenge: "stones,England,circle",
  "Machu Picchu": "Peru,Inca,mountain",
  "Niagara Falls": "water,Canada,waterfall",
  "The Golden Gate Bridge": "San Francisco,red,bridge",
  "Mount Everest": "mountain,tallest,Himalayas",
  "A Game Boy": "Nintendo,handheld,Tetris",
  "A Tamagotchi": "virtual,pet,egg",
  "A Furby": "toy,talking,fur",
  Blockbuster: "video,rental,VHS",
  "Dial-up internet": "modem,phone,slow",
  "An iPod": "Apple,music,click wheel",
  "A Walkman": "Sony,cassette,music",
  "A mixtape": "songs,cassette,record",
  "A floppy disk": "computer,save,storage",
  "A Rubik's Cube": "colors,puzzle,twist",
  "A Magic 8 Ball": "fortune,shake,toy",
  "A lava lamp": "wax,light,bubbles",
  Gravity: "fall,Newton,attraction",
  "A magnet": "metal,attract,poles",
  "An atom": "electron,proton,nucleus",
  "A microscope": "small,lens,magnify",
  "A telescope": "stars,space,lens",
  "A volcano": "lava,eruption,mountain",
  "A black hole": "gravity,space,light",
  DNA: "genes,helix,code",
  Photosynthesis: "sunlight,plants,energy",
  "The periodic table": "elements,chemistry,symbols",
  "A double helix": "DNA,spiral,strands",
  "Schrödinger's cat": "box,alive,dead",
  "Quantum entanglement": "particles,spooky,Einstein",
};
// Explicit recognition bands for source-derived decks. Broad landmarks are easy;
// smaller specialist venues and highly specific situations are hard.
const localBands = {
  church: [
    "Church Street Marketplace|City Hall Park|Burlington City Hall|Fletcher Free Library|The Flynn|City Market|Ben & Jerry's scoop shop|Battery Park|Lake Champlain Chocolates|Nectar's|Gravy fries|The Friendly Toast|Outdoor Gear Exchange|Farmhouse Tap & Grill|Leunig's Bistro",
    "Flora & Fauna|Deli 126|Little Italy|Wilder Wines|Required Viewing|The Grey Jay|Vermont Stage|Queen City Ghostwalk|Mad River Distillers|JP's Pub|Revolution Kitchen|Onyx Tonics",
  ],
  eat: [
    "Creemee|Maple creemee|Al's French Fries|Gravy fries|Heady Topper|Cider donut|Ben & Jerry's|Free Cone Day|Sugar on snow|Burlington Farmers Market|Montreal-style bagel|Speeder & Earl's",
    "Rauchbier|Wit's Up|Magic bacon|Duff Hour|Mock eel|The lamb sandwich|Sourdough donut|Mirabelles pastry|Sam Mazza's raspberry cookies|Affogato at Scout|Shacksbury",
  ],
  vermont: [
    "Creemee|Mud season|Stick season|Champ|Phish|Ethan Allen|Heady Topper|Cider donut|Ben & Jerry's|Burton Snowboards|Vermont Teddy Bear|Covered bridges|Mount Mansfield|Camel's Hump|The Lake Monsters|Catamounts|Sap buckets",
    "The 251 Club|Snowflake Bentley|The von Trapps|The river of crows|Foraging ramps|The Winooski dome|Fossil reef on Isle La Motte|VAST snowmobile trails|Ira Allen|Contra dance",
  ],
  lake: [
    "Champ|North Beach|Oakledge Park|Waterfront Park|Battery Park|Vermont Lake Monsters|ECHO|The Greenway|The causeway|The bike ferry|Ice fishing|Lake swims",
    "Valcour Island|The General Butler|The Vermont (steamboat)|Isle La Motte fossil reef|Pancake ice|Lone Rock Point|Wreck diving|The Donahue Sea Caves|Lake Champlain Maritime Museum",
  ],
  "south-end": [
    "Oakledge Park|World's Tallest Filing Cabinet|South End Art Hop|Pine Street (South End Shopping)|Burlington Beer Company|Citizen Cider|Switchback Brewing Co.|Zero Gravity Craft Brewery",
    "AO Glass|Barge Canal Market|The Soda Plant|Speaking Volumes|Brio Coffeeworks|Savu Sauna|Venetian Soda Lounge|Scout & Company",
  ],
  "north-end": [
    "North Beach|Leddy Beach|Ethan Allen Park|Radio Bean|Pho Hong|Taco Gordo|Beansie's Bus|Intervale Center",
    "Poppy Cafe & Market|Junktiques Collective|Ms. Weinerz|The Wise Fool|May Day|St. Mark's Bowling|Donahue Sea Caves (Winter)|Lakeview Cemetery",
  ],
  "beyond-btown": [
    "Champlain Valley Fair|Sunset Drive-In|Winooski Riverwalk & Falls|Sneakers Bistro|Four Quarters Brewing|Sam Mazza's Farm Market|Village Scoop|The Monkey House",
    "Hyde Log Cabin|Boxcar Bakery|Five Corners Antiques|Sunny Hollow Natural Area|The Essex Resort & Spa|Essex Family Fun & Entertainment Center|Autumn Records|Saint Michael's Playhouse",
  ],
  cafe: [
    "Muddy Waters|Speeder & Earl's|Ben & Jerry's (Church Street Scoop Shop)|Burlington Bay Market & Café|Lake Champlain Chocolates (Factory Store)|August First Bakery & Café|Myer's Bagels|Village Scoop",
    "Boxcar Bakery|Ms. Weinerz|Palmer Lane Maple|Poor House Pies|Brio Coffeeworks|Poppy Cafe & Market|Scout & Company",
  ],
  night: [
    "Foam Brewers|Citizen Cider|Switchback Brewing Co.|Burlington Beer Company|Higher Ground|Radio Bean|Nectar's|The Alchemist|Fiddlehead Brewing Company",
    "Snow Farm Vineyard|Shacksbury Cider Tasting Room|Stone Corral Brewery|Venetian Soda Lounge|Mad River Distillers Tasting Room|Deli 126|Light Club Lamp Shop",
  ],
  arts: [
    "Shelburne Museum|BCA Center|Flynn Center for the Performing Arts|Vermont Comedy Club|Fletcher Free Library|Phoenix Books|World's Tallest Filing Cabinet|Sunset Drive-In",
    "Rokeby Museum|Birds of Vermont Museum|Snowflake Bentley Exhibit (Old Red Mill)|Winooski Mill Museum|Required Viewing (Mystery Movie Club)|Speaking Volumes|Saint Michael's Playhouse",
  ],
  outside: [
    "North Beach|Waterfront Park|Oakledge Park|Mount Mansfield|Camel's Hump|Red Rocks Park|Battery Park|Vermont Lake Monsters|Vermont Green FC|Bolton Valley Resort|Ethan Allen Park",
    "Sunny Hollow Natural Area|Green Mountain Audubon Center|Colchester Pond Natural Area|Underhill State Park|Dragon Boating (Malia Paddling Club)|Donahue Sea Caves (Winter)|Lakeview Cemetery|Vermont Pool & Bar",
  ],
  landmarks: [
    "Church Street|City Hall Park|Battery Park|Waterfront Park|The Flynn|Fletcher Free Library|North Beach|Oakledge Park|UVM Green|Champlain College|The Winooski Circle|Winooski Falls",
    "Arthur Park|Smalley Park|Schmanska Park|The Maltex|Dewey Park|Greenmount Cemetery|Lakeside Park|Pomeroy Park|Roosevelt Park",
  ],
};
for (const d of decks) {
  const bands = localBands[d.id];
  if (bands) {
    const easy = new Set(split(bands[0])),
      hard = new Set(split(bands[1]));
    for (const c of d.cards) c.d = easy.has(c.t) ? 1 : hard.has(c.t) ? 3 : 2;
  }
  if (d.id === "act") {
    for (const c of d.cards)
      c.d =
        c.t.length > 65
          ? 3
          : /Shoveling|Eating a maple|Tapping a maple|Picking apples|Learning to knit|Walking a shelter|Running the Vermont/.test(
                c.t,
              )
            ? 1
            : 2;
  }
}
let serial = 0;
for (const d of decks) {
  for (const c of d.cards) {
    if (bans[c.t]) c.ban = bans[c.t].split(",");
    if (d.id === "songs") c.kind = "song";
    if (!c.source)
      c.source =
        d.group === "local"
          ? "editorial:local-prompts-v1"
          : "editorial:party-prompts-v1";
  }
  d.level = d.cards.every((c) => c.d === 1)
    ? "Easy"
    : d.cards.every((c) => c.d === 3)
      ? "Hard"
      : "Mixed";
  d.cards.forEach((c) => serial++);
}
// Lead with a balanced shelf. The remaining decks are grouped for easy browsing.
const order = [
  "church",
  "warmup",
  "vermont",
  "movies",
  "act-general",
  "eat",
  "animals",
  "songs",
  "only-here",
  "lake",
  "nineties",
  "kids",
];
decks.sort((a, b) => {
  const ai = order.indexOf(a.id),
    bi = order.indexOf(b.id);
  return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi);
});
fs.writeFileSync(
  "dist/js/decks.js",
  "// Editorial snapshot: 2026-09-12. Source provenance retained per card.\nexport const decks=" +
    JSON.stringify(decks, null, 1) +
    ";\nimport { extraDecks } from \"./extra-decks.js\";\ndecks.push(...extraDecks);\n",
);
await import("./inventory.mjs");
