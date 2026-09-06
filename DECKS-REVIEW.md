# Heads Up, Burlington — deck review

Six decks, 373 cards, drafted 2026-09-06 from btown-brief data and the newsletter
archive. Every hint carries a source in `data/decks.json` (`s`). Nothing below is
invented, but a handful lean on an outside URL or an inference, and those are the
ones to eyeball first. Strike anything that doesn't land and it gets cut from the
JSON (`node scripts/validate-decks.mjs` after).

## Quarantined 2026-09-06 (Astra review)

Nineteen cards whose hint rested on an inference, an outside page, or a scraped
restaurants.json row were moved out of `data/decks.json` into
`data/decks-unconfirmed.json`, which the game never loads: Sneakeasy, Cabot cheddar (both
decks), Korean fried chicken at Donwoori, Onion City Chicken & Oysters, Kismet, Bernie's
mittens, Darn Tough socks, Flatlander, Leaf peepers, The Green Mountain Boys, Town Meeting
Day (both decks), Fall foliage, Rí Rá, E.B. Strong's, Dobra Tea, Kru Coffee, Captain Tom's
Tiki Bar. The decks now hold 354 cards. To bring one back: confirm the fact, move the object
into its deck in `data/decks.json`, delete it from the quarantine file, run
`node scripts/validate-decks.mjs` (it refuses a card present in both files). Nectar's and
the gravy fries stay in: the closure is a verified fact, not an inference.

## Confirm first

- [ ] **[CONFIRM] The name.** "Heads Up!" is a registered trademark of a commercial
  party game (Warner Bros. / Ellen DeGeneres). "Heads Up, Burlington" is what the
  brief asked for and what shipped, but it is the one thing worth a second thought
  before it is promoted widely. Renaming touches `index.html`, `manifest.webmanifest`,
  `README.md`, `AGENTS.md`, `shareText` in `js/engine.js`, and the three listing
  entries. The repo slug `heads-up-btown` would also need renaming on GitHub.
- [ ] **[CONFIRM] Bernie's mittens** (Very Vermont). Hint says the mittens were made in
  Essex Junction. Source is the Wikipedia article on the meme, not our data; the
  newsletter archive never mentions them.
- [ ] **[CONFIRM] Cabot cheddar** (Eat Btown, Very Vermont). "Cooperative" comes from
  general knowledge; the archive only names Cabot as a brand a Franklin County
  processing hub supplied.
- [ ] **[CONFIRM] Darn Tough socks** (Very Vermont). "Lifetime warranty" is general
  knowledge; the archive only has the warranty pop-up at Patagonia Burlington.
- [ ] **[CONFIRM] Flatlander** (Very Vermont). No archive mention; sourced to the Btown
  Party mode of the same name.
- [ ] **[CONFIRM] Leaf peepers** (Very Vermont, Newcomer). Only in-house source is a
  Two Heads prompt in party-content.
- [ ] **[CONFIRM] The Green Mountain Boys** hint says it is still the National Guard's
  name, inferred from the Jan 5, 2026 edition ("all Green Mountain Boys are safe").
- [ ] **[CONFIRM] Town Meeting Day** hint says towns vote in person in March. March
  comes from the archive; "in person" is general knowledge.
- [ ] **[CONFIRM] Sneakeasy** (Eat Btown). openings.json lists a grand opening of
  Aug 27, 2026 as "opening soon"; the hint says it opened in August 2026.
- [ ] **[CONFIRM] Nectar's / Gravy fries** (Church Street, Eat Btown). Nectar's closed
  in 2025. Kept as a memory card because the hint says so; cut if you would rather
  the decks only hold places that are open.
- [ ] **[CONFIRM] restaurants.json cards**: Rí Rá, E.B. Strong's, Dobra Tea, Kru
  Coffee, Captain Tom's Tiki Bar, Onion City Chicken & Oysters, Kismet, Donwoori.
  That file is scraped and only says `closed: false`; nobody has walked past
  them for this deck.
- [ ] **[CONFIRM] Act It Out prompts** are actions written around a sourced thing
  (e.g. "Night skiing at Bolton under the lights" rests on things.json's Bolton
  entry). The month or weather in a prompt ("in February", "after a nor'easter")
  is flavor, not a sourced claim.

## Sources used

| code | file |
|---|---|
| things.json, history-facts.json, walking-tour.json, hobbies.json, clubs.json, sunset-spots.json, restaurants.json, openings.json, sports.json | `~/btownbrief/btown-brief/data/` |
| archive:YYYY-MM-DD | `~/btownbrief/archive/editions/` edition of that date |
| party-content/… | `~/btownbrief/party-content/` |
| https://… | outside page, listed above under Confirm first |


## 🧱 Church Street & Downtown (`church`, 68 cards)

- [ ] **Church Street Marketplace** — Four brick blocks with no cars, Burlington's center since 1981. *(things.json)*
- [ ] **The Unitarian Church** — The white spire at the top of Church Street, standing since 1816. *(history-facts.json)*
- [ ] **City Hall Park** — The lawn set aside by Burlington's proprietors in 1798, once Court House Square. *(walking-tour.json)*
- [ ] **Burlington City Hall** — The 1928 building by McKim, Mead and White, the firm behind the old Penn Station. *(history-facts.json)*
- [ ] **Fletcher Free Library** — Burlington's Carnegie library on College Street, built over a filled-in ravine. *(history-facts.json)*
- [ ] **The Flynn** — A 1,400-seat Art Deco theater from 1930 on Main Street that never went dark. *(things.json)*
- [ ] **Vermont Comedy Club** — Vermont's only dedicated comedy club, with a free open mic on Wednesdays. *(things.json)*
- [ ] **BCA Center** — Burlington City Arts' free gallery on Church Street. *(things.json)*
- [ ] **Frog Hollow** — Juried Vermont craft, ceramics to glass, in a Church Street gallery. *(things.json)*
- [ ] **Phoenix Books** — The downtown independent bookstore with a deep Vermont shelf. *(things.json)*
- [ ] **Crow Bookshop** — Used books on Church Street with creaky floors and staff picks. *(things.json)*
- [ ] **Outdoor Gear Exchange** — Church Street's gear shop with a consignment section downstairs. *(things.json)*
- [ ] **Burlington Records** — Downtown's independent vinyl shop; the crates reward patience. *(things.json)*
- [ ] **Flora & Fauna** — Downtown's oddest gift shop, taxidermy-adjacent curiosities and plants. *(things.json)*
- [ ] **City Market** — The downtown food co-op on South Winooski Avenue, open to non-members. *(things.json)*
- [ ] **Farmhouse Tap & Grill** — Bank Street farm-to-table whose burger is the local standard. *(things.json)*
- [ ] **Leunig's Bistro** — The French-style bistro with café seating on the Church Street bricks. *(things.json)*
- [ ] **Honey Road** — Eastern Mediterranean mezze on Church Street, famous for fried halloumi. *(things.json)*
- [ ] **Hen of the Wood** — Cherry Street's benchmark farm-to-table room; the mushroom toast never leaves the menu. *(things.json)*
- [ ] **Pizzeria Verità** — Neapolitan pies from a wood oven on St. Paul Street. *(things.json)*
- [ ] **American Flatbread** — Wood-fired flatbread on St. Paul Street, where Zero Gravity first brewed. *(things.json)*
- [ ] **Henry's Diner** — The Bank Street diner serving since the 1920s. *(things.json)*
- [ ] **Kountry Kart Deli** — The Main Street grab-and-go deli, open late, beloved by UVM students. *(things.json)*
- [ ] **Ahli Baba's Kabob Shop** — Main Street's late-night kabob counter, open until 3 AM on weekends. *(things.json)*
- [ ] **Gaku Ramen** — Rich tonkotsu ramen on Church Street. *(things.json)*
- [ ] **A Single Pebble** — Chinese banquet-style dining in a Bank Street rowhouse; the mock eel is shiitake. *(things.json)*
- [ ] **Muddy Waters** — The wood-and-plants coffee cave on Main Street that hasn't changed in decades. *(things.json)*
- [ ] **Onyx Tonics** — The College Street coffee bar for people who ask where the beans are from. *(things.json)*
- [ ] **August First** — The bakery-café that famously banned laptops. *(things.json)*
- [ ] **The Archives** — The downtown bar with dozens of arcade games and pinball. *(things.json)*
- [ ] **Deli 126** — Part New York deli, part 1920s jazz lounge, on College Street. *(things.json)*
- [ ] **Lincoln's** — The cash-only basement speakeasy where every drink is five dollars. *(things.json)*
- [ ] **Red Square** — Live music nearly every night on Church Street, with a side patio. *(things.json)*
- [ ] **The OP** — The Other Place, a classic Burlington dive with cheap pitchers and pool. *(things.json)*
- [ ] **Three Needs** — The downtown brewpub-dive famous for Duff Hour, the cheap early pint window. *(things.json)*
- [ ] **Rí Rá** — The Irish pub at 123 Church Street. *(restaurants.json)*
- [ ] **JP's Pub** — The Main Street dive with a karaoke stage four nights a week. *(hobbies.json)*
- [ ] **Nectar's** — The Main Street club that launched Phish; closed for good in 2025 after fifty years. *(walking-tour.json)*
- [ ] **Gravy fries** — French fries under turkey gravy, the Nectar's order people shouted for over fifty years. *(walking-tour.json)*
- [ ] **Memorial Auditorium** — The big Main Street hall, locked since 2016; Simon and Garfunkel played it in 1968. *(walking-tour.json)*
- [ ] **Union Station** — The 1916 rail station at the foot of Main Street with an hourglass carved on top. *(walking-tour.json)*
- [ ] **Battery Park** — The bluff-top park where American gunners fired on British ships in 1813. *(things.json)*
- [ ] **Battery Street** — Once called Water Street, because that drop used to be the edge of the lake. *(walking-tour.json)*
- [ ] **Little Italy** — The Cherry Street neighborhood erased by urban renewal in the 1960s; 167 families displaced. *(history-facts.json)*
- [ ] **Ben & Jerry's scoop shop** — The Church Street shop a few blocks from the gas station where it all started in 1978. *(things.json)*
- [ ] **Lake Champlain Chocolates** — Vermont's chocolate maker, with a Church Street café and a Pine Street factory store. *(things.json)*
- [ ] **Sweetwaters** — The Church Street restaurant that made a comeback in August 2026. *(archive:2026-08-07)*
- [ ] **Ken's Pizza and Pub** — The Church Street pizza pub outside which Party on the Bricks sets up its stage. *(archive:2026-08-10)*
- [ ] **Festival of Fools** — Street performers take over Church Street for a long weekend in early August. *(things.json)*
- [ ] **Discover Jazz Festival** — Five days of jazz every June, free on Church Street and Battery Park. *(things.json)*
- [ ] **SD Ireland cement truck parade** — Every St. Patrick's Day the concrete company parades its mixers covered in lights. *(things.json)*
- [ ] **Vermont Pub & Brewery** — Vermont's original brewpub, opened in 1988 by Greg Noonan. *(things.json)*
- [ ] **Mad River Distillers** — The St. Paul Street tasting room for the Warren distillery's whiskey and rum. *(things.json)*
- [ ] **Queen City Ghostwalk** — A guided evening walk through Burlington's fires and hauntings. *(things.json)*
- [ ] **The Boardroom** — Vermont's first board game café, 500-plus games by the table. *(things.json)*
- [ ] **Handy's Lunch** — The family-run lunch counter on Maple Street with regulars who never look at the menu. *(things.json)*
- [ ] **The Friendly Toast** — All-day breakfast in a kitsch-crammed room near Church Street. *(things.json)*
- [ ] **The Grey Jay** — A polished modern American room and cocktail list a block off Church Street. *(things.json)*
- [ ] **E.B. Strong's** — The prime steakhouse at 10 Church Street. *(restaurants.json)*
- [ ] **Zabby & Elf's Stone Soup** — Cafeteria-style vegetarian-leaning food on College Street with a daily hot bar. *(things.json)*
- [ ] **Revolution Kitchen** — Creative vegetarian dining downtown that omnivores book on purpose. *(things.json)*
- [ ] **Wilder Wines** — The College Street shop with Burlington's best natural wine selection. *(things.json)*
- [ ] **Required Viewing** — A free mystery movie club at the Spiral House on Church Street; you don't know the film until it starts. *(things.json)*
- [ ] **Vermont Stage** — Burlington's professional theater company at Main Street Landing since 1994. *(things.json)*
- [ ] **Main Street Landing Film House** — Free classic films on Tuesday evenings in a restored waterfront building. *(things.json)*
- [ ] **Dobra Tea** — The tea house at 80 Church Street. *(restaurants.json)*
- [ ] **Kru Coffee** — The coffee shop at 2 Church Street, at the top of the bricks. *(restaurants.json)*
- [ ] **Captain Tom's Tiki Bar** — The tiki bar hidden behind Ken's Pizza on Bank Street. *(restaurants.json)*

## 🍦 Eat Btown (`eat`, 69 cards)

- [ ] **Creemee** — Vermont's word for soft-serve. Never say soft-serve. *(things.json)*
- [ ] **Maple creemee** — Soft-serve with real Vermont syrup in the mix; Palmer Lane in Jericho ends the argument. *(things.json)*
- [ ] **Heady Topper** — The Alchemist's double IPA from Stowe that set off the haze craze nationally. *(things.json)*
- [ ] **Sip of Sunshine** — Lawson's Finest IPA; the Skinny Pancake taps poured the whole Sip line through foliage season 2026. *(archive:2026-08-21)*
- [ ] **Conehead IPA** — What most people come to Zero Gravity for. *(things.json)*
- [ ] **Mushroom toast** — The Hen of the Wood dish that never leaves the menu because it can't. *(things.json)*
- [ ] **Fried halloumi** — Honey Road's dish with a citywide reputation. *(things.json)*
- [ ] **Lobster roll at Shanty** — The standard order at Shanty on the Shore, the waterfront seafood institution. *(things.json)*
- [ ] **Maple-apple crepe** — The fall order at The Skinny Pancake on the waterfront. *(things.json)*
- [ ] **Al's French Fries** — Fresh-cut fries from a South Burlington spot running since 1948. *(things.json)*
- [ ] **Montreal-style bagel** — Myer's boils them in honey water and bakes them in a wood-fired oven. *(things.json)*
- [ ] **Sourdough donut** — Ms. Weinerz's cult donuts that empty the racks by mid-morning. *(things.json)*
- [ ] **Magic bacon** — Sneakers Bistro's maple bacon with a following of its own. *(things.json)*
- [ ] **Gravy fries** — Fries under turkey gravy, the Nectar's order for fifty years. *(walking-tour.json)*
- [ ] **Duff Hour** — Three Needs' famously cheap early-evening pint window; a local rite of passage. *(things.json)*
- [ ] **Mock eel** — A Single Pebble's crispy shiitake dish that converts skeptics nightly. No eel involved. *(things.json)*
- [ ] **Al pastor tacos** — Taco Gordo on North Winooski, tortillas made in-house. Al pastor first. *(things.json)*
- [ ] **Pho at Pho Hong** — The North Street Vietnamese kitchen locals measure all pho against. *(things.json)*
- [ ] **Brisket at Bluebird** — Long-smoked South End barbecue; get there before it sells out. *(things.json)*
- [ ] **The lamb sandwich** — The one that comes up every time at Four Corners of the Earth, cash only, Pine Street. *(things.json)*
- [ ] **Kountry Kart Deli sandwich** — Downtown's fast, late, hangover-curing institution on Main Street. *(things.json)*
- [ ] **Beansie's Bus** — A school bus at Battery Park slinging burgers, dogs and fries for generations. *(things.json)*
- [ ] **Cider donut** — Eat it warm from the fryer at Cold Hollow Cider Mill in Waterbury Center. *(things.json)*
- [ ] **Flavor Graveyard** — Tombstones for discontinued pints at the Ben & Jerry's factory in Waterbury. *(things.json)*
- [ ] **Free Cone Day** — Started in 1979 as Ben & Jerry's first-anniversary thank-you to Burlington. *(history-facts.json)*
- [ ] **Shy Guy Gelato** — Small-batch Sicilian-style gelato at St. Paul and Howard in the South End. *(things.json)*
- [ ] **Champ's Legendary Creemees** — The creemee window at ECHO on the waterfront, named for the lake monster. *(things.json)*
- [ ] **Little Gordo** — The summer creemee window bolted onto Taco Gordo. *(things.json)*
- [ ] **Burlington Bay creemee** — The bayside market near Perkins Pier, creemee flavors rotating weekly. *(things.json)*
- [ ] **Village Scoop** — Colchester's after-beach, after-game creemee window. *(things.json)*
- [ ] **Wit's Up** — Citizen Cider's right first pour for anyone who doesn't usually drink cider. *(things.json)*
- [ ] **Fiddlehead IPA** — Shelburne's open secret; Thursday can releases sell out. *(things.json)*
- [ ] **Switchback Ale** — Vermont's most widely distributed beer, unfiltered and hazy since 1996. *(things.json)*
- [ ] **Rauchbier** — Queen City Brewery's smoked-malt lager, the one to be brave about. *(things.json)*
- [ ] **Vacation IPA** — Foam Brewers' reliable starting point, on the waterfront. *(things.json)*
- [ ] **Deep City** — Order food here, drink Foam's beer next door, watch the lake. *(things.json)*
- [ ] **Farmhouse burger** — The Farmhouse Tap & Grill beef burger every Burlington burger gets measured against. *(things.json)*
- [ ] **Neapolitan pizza at Verità** — Blistered wood-oven pies on St. Paul Street, downtown's default best pizza. *(things.json)*
- [ ] **Wood-fired flatbread** — American Flatbread's hearth on St. Paul Street, watched from your table. *(things.json)*
- [ ] **Pizza 44** — Deep-dish attached to Queen City Brewery on Pine Street. *(things.json)*
- [ ] **Folino's** — Wood-fired pies next to Fiddlehead in Shelburne; the original is BYOB. *(things.json)*
- [ ] **Red Hen bread** — The Middlesex bakery whose bread stocks half the good restaurants in the state. *(things.json)*
- [ ] **Mirabelles pastry** — The pastry case Burlington bakers get judged against, now on Williston Road. *(things.json)*
- [ ] **Poor House Pies** — Underhill pies that may not survive the drive home. *(things.json)*
- [ ] **Sam Mazza's raspberry cookies** — The Colchester farm market's cookies with a countywide reputation. *(things.json)*
- [ ] **Willow's Bagels** — The Old North End's hand-rolled bagels, gone by late morning on weekends. *(things.json)*
- [ ] **Cafe Dim Sum** — Handmade dumplings in a small Old North End room. *(things.json)*
- [ ] **Brunch at Misery Loves Co.** — The Winooski kitchen that grew from a food truck; brunch outclasses most dinners in town. *(things.json)*
- [ ] **A window table at Waterworks** — Built into the old Champlain Mill, windows directly over the Winooski falls. *(things.json)*
- [ ] **3 AM kabob** — Ahli Baba's on Main Street, open until 3 AM on weekends. *(things.json)*
- [ ] **Muddy Waters coffee** — Main Street's wood-and-plants coffee cave, unchanged for decades. *(things.json)*
- [ ] **Speeder & Earl's** — Pine Street's original coffee roaster, pouring since before the arts district. *(things.json)*
- [ ] **Brio Coffeeworks** — The roastery inside the Soda Plant; watch the beans roast. *(things.json)*
- [ ] **Affogato at Scout** — Coffee and house-made ice cream under one roof, the reason both halves exist. *(things.json)*
- [ ] **Burlington Farmers Market** — Saturdays on Pine Street, May through October, 90-plus vendors. *(things.json)*
- [ ] **Shelburne Farms cheddar** — Cheese made and aged on-site at the 1,400-acre farm in Shelburne. *(things.json)*
- [ ] **Cabot cheddar** — Vermont's cooperative cheddar; a Franklin County processing hub supplied it and Ben & Jerry's. *(archive:2026-06-22)*
- [ ] **Trapp Family Lodge lagers** — Austrian-style beer brewed by the von Trapps' lodge in Stowe, served in a bierhall. *(things.json)*
- [ ] **Hill Farmstead** — Regularly rated the best brewery on the planet, on a Greensboro hilltop. *(things.json)*
- [ ] **Prohibition Pig** — Waterbury barbecue with its own brewery, the lunch between the Alchemist and Cold Hollow. *(things.json)*
- [ ] **Shawarma Monday** — The Wise Fool's Monday night in the Old North End, with its own word-of-mouth economy. *(things.json)*
- [ ] **Pingala breakfast sandwich** — All-vegan comfort food in the old Chace Mill; the sandwiches convert scoffers. *(things.json)*
- [ ] **Korean fried chicken at Donwoori** — Modern Korean in Winooski from siblings Summer and Khoi Cao. *(restaurants.json)*
- [ ] **Sneakeasy** — The upstairs cocktail lounge Sneakers Bistro opened in August 2026. *(openings.json)*
- [ ] **Leddy Beach Bites** — Wednesday evening food trucks on the beach all summer. *(things.json)*
- [ ] **South End Get Down** — Friday evening food trucks and live music on Pine Street all summer. *(things.json)*
- [ ] **Sugar on snow** — Hot syrup on snow at spring sugarhouse parties, like Palmer's in Shelburne. *(archive:2026-04-10)*
- [ ] **Onion City Chicken & Oysters** — The Winooski farm-to-table room on East Allen Street. *(restaurants.json)*
- [ ] **Kismet** — Turkish-Mediterranean grill on Battery Street, opened August 2024. *(restaurants.json)*

## 🍁 Very Vermont (`vermont`, 63 cards)

- [ ] **Creemee** — Soft-serve, in Vermont. Maple is the flavor that ends arguments. *(things.json)*
- [ ] **Mud season** — The April asterisk on hiking; the unwritten rule is you stay off the high trails. *(hobbies.json)*
- [ ] **Stick season** — The bare weeks between foliage and snow. Noah Kahan's song has fans stealing a Strafford road sign. *(archive:2026-07-03)*
- [ ] **Backyard sugaring** — Tap your own maples when nights freeze and days don't; boil sap in the driveway by Town Meeting Day. *(hobbies.json)*
- [ ] **Sugar on snow** — Hot maple syrup poured on snow at spring sugarhouse parties. *(archive:2026-04-10)*
- [ ] **Maple Open House Weekend** — More than 90 sugarhouses across the state open their doors one March weekend. *(archive:2026-03-30)*
- [ ] **Town Meeting Day** — The March day Vermont towns vote in person; the deadline for boiling sap. *(hobbies.json)*
- [ ] **Green Up Day** — The statewide Saturday cleanup every May. *(archive:2026-05-01)*
- [ ] **Bernie's mittens** — The wool mittens Bernie Sanders wore at the 2021 inauguration, made in Essex Junction. Instant meme. *(https://en.wikipedia.org/wiki/Bernie_Sanders_mittens_meme)* **⚠ outside source**
- [ ] **Ten votes** — Bernie Sanders' margin in Burlington's 1981 mayoral race, which survived a recount. *(history-facts.json)*
- [ ] **Champ** — Lake Champlain's monster. P.T. Barnum offered $50,000 for the hide in 1873. *(history-facts.json)*
- [ ] **Phish** — Formed at UVM in 1983; first gig in a campus dining hall that December. *(history-facts.json)*
- [ ] **Ethan Allen** — Took Fort Ticonderoga without a battle in 1775; buried in Green Mount Cemetery. *(history-facts.json)*
- [ ] **The Green Mountain Boys** — Ethan Allen's militia, and still the name of Vermont's National Guard. *(archive:2026-01-05)*
- [ ] **Flatlander** — What Vermonters call anyone from away. Also a Btown Party game about blending in. *(https://play.btownbrief.com/btown-party/)* **⚠ outside source**
- [ ] **Leaf peepers** — The fall visitors who came for the foliage. Vermont's tourism ad writes itself. *(party-content/twoheads-prompts.json)* **⚠ outside source**
- [ ] **The 251 Club** — Since 1954, Vermonters working the same checklist: visit all 251 towns and cities. *(hobbies.json)*
- [ ] **Ice fishing shanties** — A small village appears on Malletts Bay when it freezes. *(hobbies.json)*
- [ ] **Snowflake Bentley** — Jericho farmer who photographed a single snowflake in 1885, the first person ever to. *(things.json)*
- [ ] **Heady Topper** — The Stowe double IPA that started the haze craze. *(things.json)*
- [ ] **Cider donut** — Cold Hollow Cider Mill, warm from the fryer, the mandatory Route 100 stop. *(things.json)*
- [ ] **Ben & Jerry's** — Scooped its first cone in 1978 from a renovated gas station in downtown Burlington. *(history-facts.json)*
- [ ] **Free Cone Day** — Ben & Jerry's 1979 thank-you to Burlington, still going every spring. *(history-facts.json)*
- [ ] **Cabot cheddar** — Vermont's cooperative cheddar brand. *(archive:2026-06-22)*
- [ ] **Darn Tough socks** — Vermont socks with a lifetime warranty; the warranty pop-up sets up at Patagonia Burlington. *(archive:2026-04-17)*
- [ ] **Burton Snowboards** — Headquartered on Queen City Park Road in Burlington; the sample sale is an event. *(archive:2026-08-28)*
- [ ] **Vermont Teddy Bear** — The Shelburne factory with a Bear Hospital and a lifetime guarantee. *(things.json)*
- [ ] **The von Trapps** — Yes, the Sound of Music family. They settled in Stowe and their lodge brews lagers. *(things.json)*
- [ ] **Covered bridges** — Vermont has 100 historic ones; a man from Manchester, England filmed every one. *(archive:2026-06-29)*
- [ ] **A moose downtown** — They wander Burlington city streets often enough to make the national travel press. *(archive:2026-07-03)*
- [ ] **The river of crows** — Winter evenings downtown, thousands of crows streaming to roost. *(archive:2026-07-03)*
- [ ] **Mount Mansfield** — Vermont's highest summit at 4,393 feet; alpine tundra on top since the last ice age. *(things.json)*
- [ ] **Camel's Hump** — 4,083 feet, Vermont's most iconic summit that isn't Mansfield. *(things.json)*
- [ ] **Smugglers' Notch** — Route 108 squeezes through a thousand-foot cleft; trucks are banned from the hairpins. *(things.json)*
- [ ] **The Long Trail** — One of the three ways up Mansfield, on foot. *(things.json)*
- [ ] **Bolton night skiing** — The locals' hill 35 minutes out, skiing under the lights. *(things.json)*
- [ ] **Cochran's** — The nonprofit community ski hill in Richmond, run by the Cochran family since 1961. *(things.json)*
- [ ] **Mad River Glen** — The Waitsfield ski area that bought 1,100 surrounding acres in 2026. *(archive:2026-03-02)*
- [ ] **Penguin Plunge** — Jumping into Lake Champlain in March for Special Olympics Vermont; $585,000 raised in 2026. *(archive:2026-03-23)*
- [ ] **Vermont City Marathon** — Memorial Day weekend, neighborhoods turn out with hoses and cowbells. *(things.json)*
- [ ] **Vermont Green FC** — Summer soccer at Virtue Field; national champions in 2025 and 2026. *(archive:2026-08-03)*
- [ ] **The Lake Monsters** — Minor league baseball at Centennial Field, open since 1906. Champ is the mascot. *(things.json)*
- [ ] **The Gut** — Gutterson Fieldhouse, where UVM hockey is loud and old-school. *(things.json)*
- [ ] **Catamounts** — UVM's teams. The university dates to 1791, the year Vermont became a state. *(history-facts.json)*
- [ ] **Champlain Valley Fair** — Vermont's largest agricultural fair, nine days in Essex Junction each late August. *(things.json)*
- [ ] **Sunset Drive-In** — Colchester's working drive-in, AM radio for the audio, one of Vermont's last. *(things.json)*
- [ ] **Shelburne Museum** — Thirty-nine historic buildings and a beached steamboat, the Ticonderoga. *(things.json)*
- [ ] **Shelburne Farms** — A 1,400-acre working farm and National Historic Landmark. *(things.json)*
- [ ] **Hill Farmstead** — The Greensboro brewery regularly rated the best on the planet. *(things.json)*
- [ ] **Fiddlehead** — The Shelburne brewery whose Thursday can releases sell out. *(things.json)*
- [ ] **Switchback** — Unfiltered and hazy since 1996, Vermont's most widely distributed beer. *(things.json)*
- [ ] **The Alchemist** — The Stowe brewery behind Heady Topper. *(things.json)*
- [ ] **Sap buckets** — Hung on maples in late winter; sugaring runs late February to early April. *(hobbies.json)*
- [ ] **Foraging ramps** — May in the Vermont woods; chanterelles come in July. *(hobbies.json)*
- [ ] **Fat biking** — Groomed winter loops at Catamount once the snow lands. *(things.json)*
- [ ] **The first 100% renewable city** — Burlington, after buying a Winooski River dam in 2014. *(history-facts.json)*
- [ ] **Vermont's smallest largest city** — Burlington, about 44,700 people, the smallest U.S. city that is its state's largest. *(history-facts.json)*
- [ ] **Ira Allen** — Donated 50 acres to found UVM in 1791. *(history-facts.json)*
- [ ] **The Winooski dome** — In 1979 Winooski seriously studied covering the whole city with a dome. Buckminster Fuller flew in. *(history-facts.json)*
- [ ] **Fossil reef on Isle La Motte** — About 480 million years old, the oldest known reef built by a diverse community of animals. *(hobbies.json)*
- [ ] **VAST snowmobile trails** — 4,700 miles of trail groomed by volunteer clubs across the state. *(hobbies.json)*
- [ ] **Contra dance** — The sweaty 200-year-old New England tradition; Queen City Contras has run thirty years. *(hobbies.json)*
- [ ] **Knitting through the winter** — Cast on in October, wear it by February; a real yarn shop sits ten minutes down Shelburne Road. *(hobbies.json)*

## 🎭 Act It Out: Burlington (`act`, 63 cards)

- [ ] **Shoveling out your car after a nor'easter** — Snow Day Edition, January 2026: 2 to 4 more inches overnight. *(archive:2026-01-26)*
- [ ] **Waiting for a Green Mountain Transit bus in February** — GMT runs the county's buses; the #4 to Essex Center was cut in 2026. *(archive:2026-06-15)*
- [ ] **Night skiing at Bolton under the lights** — The locals' hill, 35 minutes out, with a backcountry program that outclasses its size. *(things.json)*
- [ ] **Riding a bike into the wind on the causeway** — The rail causeway runs 3.5 miles into the lake; the wind at the midpoint is real. *(things.json)*
- [ ] **Catching the bike ferry across the causeway gap** — The $4 seasonal ferry bridges the gap to South Hero. *(things.json)*
- [ ] **Tapping a maple tree in your backyard** — Backyard sugaring, late February to early April. *(hobbies.json)*
- [ ] **Boiling sap in the driveway** — By Town Meeting Day you're boiling like a real Vermonter. *(hobbies.json)*
- [ ] **Ice fishing in a shanty on Malletts Bay** — A small village of shanties appears when the bay freezes. *(hobbies.json)*
- [ ] **Eating a maple creemee before it melts** — Palmer Lane in Jericho, real syrup in the mix, summer-weekend line. *(things.json)*
- [ ] **Waiting for a brunch table at Sneakers** — Winooski's brunch institution, with a weekend wait to prove it. *(things.json)*
- [ ] **Looking for the door to Lincoln's** — The basement speakeasy's entrance is deliberately hard to find. *(things.json)*
- [ ] **Dodging a juggler at Festival of Fools** — Street performers take over Church Street in early August. *(things.json)*
- [ ] **Swinging on the yellow porch swings at Waterfront Park** — The swings facing the Adirondacks, in every summer photo. *(things.json)*
- [ ] **Leaning on a cannon at Battery Park for sunset** — The cannons make a good leaning post over the full Adirondack ridgeline. *(sunset-spots.json)*
- [ ] **Swimming behind the waterfall at Bristol Falls** — On a good-flow day you can swim behind the curtain. *(things.json)*
- [ ] **Jumping into the Bolton Potholes** — The staircase of stone bowls on Joiner Brook; check depth first. *(things.json)*
- [ ] **Standing in line for Free Cone Day** — Ben & Jerry's on Church Street, every spring since 1979. *(history-facts.json)*
- [ ] **Contra dancing at Queen City Contras** — Every dance is taught, no partner needed, live bands and callers. *(clubs.json)*
- [ ] **Singing karaoke at JP's Pub** — Four nights a week; the room claps for people who are objectively not good. *(hobbies.json)*
- [ ] **Climbing the tower at Ethan Allen Park** — The 1905 stone observation tower; access is seasonal. *(things.json)*
- [ ] **Riding an e-bike down the Greenway** — Eight miles of car-free path along the lake, Winooski to Oakledge. *(things.json)*
- [ ] **Waiting for a Fiddlehead can release** — Thursday can releases in Shelburne; the IPA sells out. *(things.json)*
- [ ] **Ordering a Duff Hour pint at Three Needs** — The famously cheap early-evening window, a rite of passage. *(things.json)*
- [ ] **Singing in the Vermont Green FC supporters' section** — Outsings most professional clubs, at Virtue Field. *(things.json)*
- [ ] **Playing stick-and-puck at Leddy Arena** — The city rink at Leddy Park; skate rentals at the counter. *(things.json)*
- [ ] **Fat-biking at Catamount** — Groomed fat-bike and snowshoe loops in Williston once the snow lands. *(things.json)*
- [ ] **Foraging ramps in May** — The woods around here feed you once you learn what you're looking at. *(hobbies.json)*
- [ ] **Picking apples at Shelburne Orchards** — Adirondacks stacked behind the rows; the ciderhouse pours fresh-pressed cider. *(things.json)*
- [ ] **Eating a cider donut warm from the fryer** — Cold Hollow Cider Mill, the only correct way. *(things.json)*
- [ ] **Reading in the corner at Muddy Waters** — The read-a-book-in-the-corner café on Main Street. *(things.json)*
- [ ] **Playing pinball at the Pinball Co-op** — Forty machines, one flat fee, Wednesday and Friday evenings in South Burlington. *(things.json)*
- [ ] **Candlepin bowling in a church basement** — St. Mark's Bowling in the New North End, a Burlington open secret. *(things.json)*
- [ ] **Blowing glass at AO Glass** — The South End hot shop; furnaces sit at 2,100 degrees all day. *(hobbies.json)*
- [ ] **Watching the cement truck parade** — SD Ireland covers its mixers in lights every St. Patrick's Day. *(things.json)*
- [ ] **Running the Vermont City Marathon** — Memorial Day weekend, finishing at the waterfront. *(things.json)*
- [ ] **Paddling a dragon boat** — Twenty-person boats out of the Community Sailing Center on Saturday mornings. *(things.json)*
- [ ] **Doing 7 AM yoga on the floating dock** — Daily in summer at the Community Sailing Center. *(things.json)*
- [ ] **Cold plunging into Lake Champlain after the sauna** — Savu Sauna by the lake; in winter, straight into Champlain if you've got the nerve. *(things.json)*
- [ ] **Walking a shelter dog** — The county shelter's dogs need walking every day. *(hobbies.json)*
- [ ] **Tubing down the river with Umiak** — Rent a tube in Waterbury or Richmond; the answer to a 90-degree afternoon. *(things.json)*
- [ ] **Watching a drive-in movie with the radio on** — Sunset Drive-In in Colchester, AM radio for the audio. *(things.json)*
- [ ] **Digging through the crates at Burlington Records** — The downtown vinyl shop; the staff have opinions. *(things.json)*
- [ ] **Riding the gondola up Mount Mansfield** — One of three ways up: Long Trail, Stowe gondola, or the toll road. *(things.json)*
- [ ] **Hiking Camel's Hump at dawn** — Plan 5 to 6 hours and an early start on summer weekends. *(things.json)*
- [ ] **Driving the hairpins through Smugglers' Notch** — So tight that trucks are banned. *(things.json)*
- [ ] **Cheering at the Gut for UVM hockey** — Gutterson Fieldhouse, the best cheap winter night out. *(things.json)*
- [ ] **Eating a hot dog at a Lake Monsters game** — Centennial Field, open since 1906. The hot dogs are exactly right. *(things.json)*
- [ ] **Sailing on the Whistling Man schooner in a sweater** — Ten guests, two hours, the lake runs ten degrees cooler than shore. *(things.json)*
- [ ] **Watching the sunset from the Spirit of Ethan Allen** — The sunset dinner cruise is the version worth taking. *(things.json)*
- [ ] **Spotting a moose on a city street** — It happens often enough to make the national travel press. *(archive:2026-07-03)*
- [ ] **Watching the river of crows come in** — Winter evenings downtown, thousands of crows heading to roost. *(archive:2026-07-03)*
- [ ] **Stacking pancake ice at Leddy Beach** — Rare pancake ice appeared at Leddy Beach in February 2025. *(archive:2025-02-07)*
- [ ] **Taking the Penguin Plunge** — Into Lake Champlain in March for Special Olympics Vermont. *(archive:2026-03-23)*
- [ ] **Shopping the Burton sample sale** — At Burton Snowboards HQ on Queen City Park Road. *(archive:2026-08-28)*
- [ ] **Picking up litter on Green Up Day** — The statewide cleanup Saturday every May. *(archive:2026-05-01)*
- [ ] **Eating sugar on snow at a sugarhouse** — Hot syrup on snow, spring parties at Palmer's Sugarhouse in Shelburne. *(archive:2026-04-10)*
- [ ] **Walking into the Donahue Sea Caves over the ice** — Only reachable in deep winter, walking in over solid ice. Never alone. *(things.json)*
- [ ] **Setting up a lawn chair at Camp Meade** — Free Sunday-evening music in Middlesex, kids running loose. *(things.json)*
- [ ] **Counting the drawers on the World's Tallest Filing Cabinet** — Thirty-eight drawers stacked 38 feet high on Flynn Avenue; birds nest in the top ones. *(things.json)*
- [ ] **Getting lost in Five Corners Antiques** — Enter curious, exit two hours later carrying a lamp. *(things.json)*
- [ ] **Playing Bananagrams at The Boardroom** — Vermont's first board game café, 500-plus games. *(things.json)*
- [ ] **Learning to knit for winter** — Cast on in October, wear it by February. *(hobbies.json)*
- [ ] **Bird-watching at Delta Park** — Where the Winooski meets Champlain; herons and spring migrants. *(things.json)*

## 🌊 Lake Champlain (`lake`, 50 cards)

- [ ] **Champ** — The lake monster. Barnum offered $50,000 for the hide in 1873; ECHO has an exhibit. *(history-facts.json)*
- [ ] **The Burlington Breakwater** — A 19th-century timber-crib breakwater begun in 1836, on the National Register. *(history-facts.json)*
- [ ] **The causeway** — The old railroad causeway running 3.5 miles into the lake toward South Hero. *(things.json)*
- [ ] **The bike ferry** — The $4 seasonal ferry across the gap in the causeway. *(things.json)*
- [ ] **Valcour Island** — Where American and British fleets clashed in October 1776. *(history-facts.json)*
- [ ] **A Great Lake for 18 days** — In March 1998 Lake Champlain was legally one of America's Great Lakes. *(history-facts.json)*
- [ ] **107 miles long** — The lake's length; 400 feet at its deepest point. *(history-facts.json)*
- [ ] **The Adirondacks** — The mountains across forty miles of water from North Beach. *(things.json)*
- [ ] **Spirit of Ethan Allen** — Vermont's largest lake cruise vessel; the sunset dinner cruise is the one. *(things.json)*
- [ ] **ECHO** — The lake-science museum at the foot of College Street, built where 83 fuel tanks once stood. *(walking-tour.json)*
- [ ] **North Beach** — Burlington's most social beach, lifeguards, campground, at capacity by 11 AM in August. *(things.json)*
- [ ] **Oakledge Park** — Red-rock swimming spots and the world's first fully ADA-accessible treehouse. *(things.json)*
- [ ] **Red Rocks Park** — 70-foot cliffs over the broad lake in South Burlington; Permian-era rock. *(things.json)*
- [ ] **Sand Bar State Park** — The warmest, shallowest swimming on this side of the lake, in Milton. *(things.json)*
- [ ] **Perkins Pier** — Sailboat masts in the foreground turn every sunset photo into a postcard. *(sunset-spots.json)*
- [ ] **Burlington Bay Market** — Creemees near Perkins Pier, flavors rotating by the week. *(things.json)*
- [ ] **Community Sailing Center** — The nonprofit sailing school with summer lessons and dock yoga. *(things.json)*
- [ ] **Dragon boat** — Twenty-person boats charging out of the sailing center. *(hobbies.json)*
- [ ] **Wreck diving** — Eight 19th-century shipwrecks under mooring buoys, open to registered divers. *(hobbies.json)*
- [ ] **The General Butler** — The 1876 canal schooner wrecked near the breakwater, a favorite dive site. *(history-facts.json)*
- [ ] **The Vermont (steamboat)** — The world's second commercial steamboat, launched from Burlington in 1809. *(history-facts.json)*
- [ ] **Vermont Lake Monsters** — Minor league baseball at Centennial Field; Champ is the mascot. *(things.json)*
- [ ] **Splash at the Boathouse** — Casual dock food at the Community Boathouse with the loosest dress code on the waterfront. *(things.json)*
- [ ] **Shanty on the Shore** — The waterfront seafood institution with a deck over the water. *(things.json)*
- [ ] **Texaco Beach** — The off-leash dog beach on the Greenway, named for the gas station that stood there. *(things.json)*
- [ ] **Leddy Beach** — The North End's calmer beach, with Wednesday food trucks in summer. *(things.json)*
- [ ] **Rock Point** — Where the Champlain Thrust Fault puts 500-million-year-old rock on top of younger stone. *(things.json)*
- [ ] **Delta Park** — Where the Winooski River empties into Lake Champlain; one of the county's best birding sites. *(things.json)*
- [ ] **Waterfront Park** — The green lawn and yellow swings facing the Adirondacks. *(things.json)*
- [ ] **The Greenway** — Eight miles of paved car-free path along the waterfront. *(things.json)*
- [ ] **The FRAME** — The Moran coal plant stripped to its red steel skeleton, reopened as a pavilion. *(history-facts.json)*
- [ ] **Lone Rock Point** — Two miles of cedar-shaded trail on church-owned land beside North Beach. *(things.json)*
- [ ] **Isle La Motte fossil reef** — Roughly 480 million years old, lying in open pasture. *(hobbies.json)*
- [ ] **South Hero** — The island at the far end of the causeway; Snow Farm Vineyard is reachable by bike. *(things.json)*
- [ ] **Grand Isle** — Home of the 1783 Hyde Log Cabin, one of the oldest in the country. *(things.json)*
- [ ] **The Donahue Sea Caves** — Reachable only in deep winter, walking in over solid ice. *(things.json)*
- [ ] **Penguin Plunge** — The March jump into the lake for Special Olympics Vermont. *(archive:2026-03-23)*
- [ ] **Burlington Surf Club** — Paddleboard and windsurf rentals at the bottom of Lakeside Avenue. *(things.json)*
- [ ] **Whistling Man Schooner** — Two-hour evening sails, maximum ten guests, BYOB. *(things.json)*
- [ ] **Lake Champlain Maritime Museum** — Three centuries of the lake's working life in Ferrisburgh; admission is free. *(things.json)*
- [ ] **Lumber port** — By the 1870s Burlington's waterfront was the third-largest lumber market in the world. *(history-facts.json)*
- [ ] **Battery Park gunners** — Helped drive off a British squadron on the lake in August 1813. *(history-facts.json)*
- [ ] **Pancake ice** — The rare stacked ice disks that showed up at Leddy Beach in February 2025. *(archive:2025-02-07)*
- [ ] **Sunset chasing** — The sun goes down over the Adirondacks across ten miles of open water. *(hobbies.json)*
- [ ] **Andy A-Dog Williams Skatepark** — The concrete skatepark on the Greenway, Adirondacks behind the halfpipe. *(things.json)*
- [ ] **Shelburne Bay** — The bay the unmarked lookout at Shelburne Bay Park looks over. *(things.json)*
- [ ] **Niquette Bay** — Colchester's park with trails ending at cobbled Lake Champlain beaches. *(things.json)*
- [ ] **Colchester Causeway sunset** — Three miles of marble spit where the sunset surrounds you. *(sunset-spots.json)*
- [ ] **Lake swims** — Between beaches and river holes, half of summer is picking which water to get in. *(hobbies.json)*
- [ ] **Ice fishing** — Malletts Bay freezes and a village of shanties appears. *(hobbies.json)*

## 🌱 Newcomer Mode (`newcomer`, 60 cards)

- [ ] **Church Street** — The four-block pedestrian mall downtown, car-free since 1981. *(things.json)*
- [ ] **Lake Champlain** — 107 miles long, 400 feet deep, the whole west side of town. *(history-facts.json)*
- [ ] **Ben & Jerry's** — Started in a Burlington gas station in 1978. *(history-facts.json)*
- [ ] **UVM** — The University of Vermont, founded 1791, fifth-oldest in New England. *(history-facts.json)*
- [ ] **Maple syrup** — The anchor of the Saturday farmers market. *(things.json)*
- [ ] **Creemee** — Vermont soft-serve. Learn the word first. *(things.json)*
- [ ] **Bernie Sanders** — Burlington's mayor from 1981, elected by ten votes. *(history-facts.json)*
- [ ] **Phish** — The band formed at UVM in 1983. *(history-facts.json)*
- [ ] **Skiing** — Bolton, Cochran's, Mansfield; 'I ski after work' is a normal sentence here. *(hobbies.json)*
- [ ] **A snow shovel** — Snow Day Edition, January 2026: 2 to 4 more inches overnight. *(archive:2026-01-26)*
- [ ] **Waterfront Park** — The lawn with the yellow swings facing the mountains. *(things.json)*
- [ ] **The bike path** — Eight miles along the lake, Winooski to Oakledge. *(things.json)*
- [ ] **The farmers market** — Saturdays on Pine Street, May through October. *(things.json)*
- [ ] **The ferry** — Bike ferry on the causeway; the Adirondack ferries cross the lake. *(things.json)*
- [ ] **The Adirondacks** — The mountains across the lake, in every sunset photo. *(things.json)*
- [ ] **Winooski** — The mill city across the river, with a roundabout and waterfalls. *(things.json)*
- [ ] **The South End** — Pine Street's breweries, studios and Art Hop. *(things.json)*
- [ ] **The Old North End** — The neighborhood with Pho Hong, Radio Bean and Taco Gordo. *(things.json)*
- [ ] **Pine Street** — Converted industrial buildings, vintage shops, breweries. *(things.json)*
- [ ] **The Flynn** — The 1930 Art Deco theater on Main Street. *(things.json)*
- [ ] **ECHO** — The lake museum on the waterfront, with Champ lore. *(things.json)*
- [ ] **Higher Ground** — The club in South Burlington that brings touring acts. *(things.json)*
- [ ] **A brewery** — Vermont has more craft breweries per capita than any state. *(things.json)*
- [ ] **Hard cider** — Citizen Cider on Pine Street, from Vermont apples. *(things.json)*
- [ ] **Fall foliage** — The leaf peepers come for it every October. *(party-content/twoheads-prompts.json)* **⚠ outside source**
- [ ] **Mud season** — April. Stay off the high trails. *(hobbies.json)*
- [ ] **A sugarhouse** — Where sap becomes syrup; 90-plus open their doors one March weekend. *(archive:2026-03-30)*
- [ ] **Cheddar** — Shelburne Farms makes and ages it on the farm. *(things.json)*
- [ ] **Apple picking** — Shelburne Orchards, with the Adirondacks behind the rows. *(things.json)*
- [ ] **Sunset** — People here genuinely plan their evenings around it. *(hobbies.json)*
- [ ] **North Beach** — The city's most social beach, in the New North End. *(things.json)*
- [ ] **Champ** — The lake monster on every souvenir. *(history-facts.json)*
- [ ] **The Green Mountains** — Mansfield is the highest at 4,393 feet. *(things.json)*
- [ ] **Montreal** — Ninety minutes north; half the old family names here are French. *(hobbies.json)*
- [ ] **Camel's Hump** — The day-trip summit that isn't Mansfield. *(things.json)*
- [ ] **Mount Mansfield** — Vermont's highest peak; gondola, toll road or the Long Trail. *(things.json)*
- [ ] **Shelburne Museum** — Thirty-nine buildings and a beached steamboat, seven miles south. *(things.json)*
- [ ] **Vermont Teddy Bear** — The Shelburne factory tour with a Bear Hospital. *(things.json)*
- [ ] **Ben & Jerry's factory tour** — Waterbury, with the Flavor Graveyard. *(things.json)*
- [ ] **The Lake Monsters** — Burlington's minor league baseball team. *(things.json)*
- [ ] **The Catamounts** — UVM's teams. Hockey at the Gut. *(things.json)*
- [ ] **Snowboarding** — Burton is headquartered in Burlington. *(archive:2026-08-28)*
- [ ] **A covered bridge** — Vermont has 100 historic ones. *(archive:2026-06-29)*
- [ ] **A moose** — They wander onto Burlington streets now and then. *(archive:2026-07-03)*
- [ ] **Town Meeting Day** — The March day towns vote in person. *(hobbies.json)*
- [ ] **The Red Sox** — New England's team, and the Brief tracks them alongside the Patriots, Bruins and Celtics. *(sports.json)*
- [ ] **The Canadiens** — Montreal's hockey team, close enough to split loyalties. *(sports.json)*
- [ ] **Ice cream** — Ben & Jerry's, or a creemee. Two different things. *(things.json)*
- [ ] **A food truck** — South End Get Down on Fridays, Leddy Beach Bites on Wednesdays. *(things.json)*
- [ ] **Kayaking** — Paddling the lake on a calm evening turns the city into a postcard. *(hobbies.json)*
- [ ] **A snowstorm** — Snow Day Edition: teens all week. *(archive:2026-01-26)*
- [ ] **Hiking** — Camel's Hump and Mansfield are day trips; Philo is barely a lunch break. *(hobbies.json)*
- [ ] **Pizza** — Verità for Neapolitan, Pizza 44 for deep dish, Ken's on Church Street. *(things.json)*
- [ ] **Coffee** — Muddy Waters, Onyx Tonics, Speeder & Earl's, Brio. *(things.json)*
- [ ] **Trivia night** — Ask r/burlington how to meet people and the answer is usually a trivia team. *(hobbies.json)*
- [ ] **A run club** — Burlington Run Club meets at Foam Brewers; most runs end at a brewery. *(clubs.json)*
- [ ] **Pickleball** — The fastest-growing hobby in the county; Szymanski Park courts stay busy. *(hobbies.json)*
- [ ] **Vermont Green FC** — Summer soccer at Virtue Field, back-to-back national champions. *(archive:2026-08-03)*
- [ ] **The Intervale** — 360 acres of organic farms and trails in the Winooski floodplain. *(things.json)*
- [ ] **Art Hop** — Three days each September when South End studios open their doors. *(things.json)*
