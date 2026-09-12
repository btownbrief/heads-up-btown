from pathlib import Path
import re, urllib.request, json, html
root=Path(__file__).resolve().parents[1]
css=(root/'artifacts-fonts.css').read_text()
blocks=[]
for block in re.findall(r'@font-face\s*\{[^}]+\}',css):
    weight=re.search(r'font-weight: (\d+)',block).group(1)
    if weight not in ('400','700'): continue
    family=re.search(r"font-family: '([^']+)'",block).group(1)
    url=re.search(r'url\(([^)]+)',block).group(1)
    dest='assets/'+family.lower().replace(' ','-')+'-'+weight+'.ttf'
    urllib.request.urlretrieve(url, root/'dist'/dest)
    blocks.append(block.replace(url,'./'+dest))
(root/'dist/fonts.css').write_text('\n'.join(blocks))
(root/'artifacts-fonts.css').unlink()
photos=json.loads(Path('/Users/stephendavis/btownbrief/where-in-btown-levels/data/spots.json').read_text())
present={p.name for p in (root/'dist/assets/photos').glob('*')}
rows=[]
for p in photos:
    if Path(p['file']).name not in present: continue
    rows.append(f'<tr><td>{html.escape(p["name"])}</td><td>{html.escape(p["author"])}</td><td>{html.escape(p["license"])}</td><td><a href="{html.escape(p["sourceUrl"])}">Original source</a></td></tr>')
(root/'dist/credits.html').write_text('''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Credits — Heads Up, Btown!</title><link rel="icon" href="./assets/icon.svg"><link rel="stylesheet" href="./style.css"><style>main{max-width:950px;margin:40px auto;padding:25px}h1{font-size:42px;margin:30px 0 20px}h2{font-size:25px;margin:35px 0 18px}p{line-height:1.8;font-size:14px;margin:14px 0}table{border-collapse:collapse;width:100%;font-size:12px}td,th{text-align:left;padding:13px 10px;border-bottom:1px solid #dce1d8;line-height:1.6}a{color:#254e40}thead{background:#e6ebdf}.scroll{overflow-x:auto}ul{font-size:13px;line-height:1.8}</style></head><body><main><a href="./">← Back to the game</a><h1>Made for good company.</h1><p>An independent Btown Brief game inspired by forehead charades. Not affiliated with the commercial Heads Up! app, Ellen DeGeneres, or Warner Bros.</p><h2>The local collection</h2><p>September 12, 2026 editorial snapshot. Local cards adapt public-place names and existing card prompts from the Btown Brief Heads Up game, the Btown place guide, Dibs landmark data, and Where in Btown photo collection. These are game prompts, not current business listings or travel recommendations. Original repository and source identifiers are retained in the card data.</p><p>General decks, difficulty bands, action prompts, and forbidden clues were curated for this edition. A card's difficulty is an editorial judgment, not a guarantee that every group will know it.</p><h2>Photo credits</h2><p>Photographs are unmodified source assets displayed with CSS sizing. Names identify the depicted locations. License notices and source links are retained below. <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a>. Each original source contains full reuse information.</p><div class="scroll"><table><thead><tr><th>Location</th><th>Photographer</th><th>License</th><th>Source</th></tr></thead><tbody>'''+''.join(rows)+'''</tbody></table></div><h2>Artwork & typography</h2><p>The illustrated Burlington cover was created with OpenAI image generation for this game. It is a stylized illustration, not a literal streetscape. DM Sans and Space Grotesk are self-hosted under the SIL Open Font License. See <a href="./assets/OFL-DM-Sans.txt">DM Sans license</a> and <a href="./assets/OFL-Space-Grotesk.txt">Space Grotesk license</a>. Interface symbols are simple functional SVGs and platform emoji.</p><h2>Your game stays with you</h2><p>No analytics, microphone, camera, or third-party tracking scripts. Names, custom decks, scores, preferences, and card history stay in your browser. Export custom decks to keep a backup. Shared deck links contain the answers in the URL fragment; anyone who receives the link can read it. Opening a private hosted version may require sign-in to the hosting service.</p><p>Room display works between tabs in the same browser and profile. It is not a remote multiplayer room. Offline saving uses browser storage and can be cleared by your browser. Microphone recognition, video recording, community voting, and live collaborative deck editing are not included.</p></main></body></html>''')
for family,folder in [('DM-Sans','dmsans'),('Space-Grotesk','spacegrotesk')]:
    urllib.request.urlretrieve(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{folder}/OFL.txt',root/'dist/assets'/f'OFL-{family}.txt')
print('Self-hosted fonts and',len(rows),'credited photos prepared.')
