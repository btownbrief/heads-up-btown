import assert from "node:assert/strict";
import fs from "node:fs";
import { decks } from "../dist/js/decks.js";
import { cardKey } from "../dist/js/engine.js";
const ids = new Set(),
  warnings = [];
for (const d of decks) {
  assert(!ids.has(d.id), "Duplicate deck " + d.id);
  ids.add(d.id);
  assert(d.cards.length >= 20, "Small deck " + d.id);
  const keys = new Set();
  for (const c of d.cards) {
    assert(c.t && c.t.length <= 110, `Invalid answer in ${d.id}: ${c.t}`);
    assert([1, 2, 3].includes(c.d), "Invalid difficulty " + c.t);
    assert(c.source, "Missing provenance " + c.t);
    const key = cardKey(c);
    assert(!keys.has(key), "Repeated answer in " + d.id + ": " + c.t);
    keys.add(key);
    if (c.ban) {
      assert(c.ban.length === 3, "Expected 3 bans");
      assert(
        c.ban.every((b) => b.length > 0 && b.length <= 32),
        "Invalid ban " + c.t,
      );
    }
    if (c.image) {
      assert(fs.existsSync("dist/" + c.image), "Missing photo");
      assert(
        c.credit?.url.startsWith("https://commons.wikimedia.org/"),
        "Missing photo source",
      );
      assert(c.credit.license && c.credit.author, "Missing photo attribution");
    }
  }
}
const files = JSON.parse(fs.readFileSync("dist/offline-files.json", "utf8"));
for (const f of files)
  assert(fs.existsSync("dist/" + f.slice(2)), "Missing offline asset " + f);
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(dir + "/" + e.name) : [dir + "/" + e.name],
    );
const listed = new Set(files);
const skip = new Set(["dist/sw.js", "dist/offline-files.json"]);
for (const p of walk("dist"))
  assert(
    skip.has(p) || listed.has("./" + p.slice(5)),
    "Shipped file missing from offline-files.json: " + p,
  );
const core = [
  ...fs
    .readFileSync("dist/sw.js", "utf8")
    .match(/const CORE = \[([\s\S]*?)\];/)[1]
    .matchAll(/"([^"]+)"/g),
].map((m) => m[1]);
for (const f of core)
  assert(
    f === "./" || fs.existsSync("dist/" + f.slice(2)),
    "Service worker caches a file that is not in dist: " + f,
  );
for (const file of ["dist/index.html", "dist/credits.html"]) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/(?:href|src)="\.\/([^"#?]+)"/g))
    assert(fs.existsSync("dist/" + m[1]), "Broken local reference " + m[1]);
}
console.log(
  `Validated ${decks.length} decks, ${decks.reduce((n, d) => n + d.cards.length, 0)} card entries, ${files.length} offline files, ${core.length} shell entries, and both HTML entrypoints.`,
);
