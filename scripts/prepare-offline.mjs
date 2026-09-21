import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((d) =>
      d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)],
    );
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export function buildOfflineManifest() {
  const files = walk("dist")
    .filter((p) => p !== "dist/sw.js" && p !== "dist/offline-files.json")
    .map((p) => "./" + p.slice(5))
    .sort();
  const hashes = Object.fromEntries(
    files.map((p) => [p, hash(fs.readFileSync("dist/" + p.slice(2)))]),
  );
  // Include worker changes without hashing the generated stamp into itself.
  const worker = fs.readFileSync("dist/sw.js", "utf8")
    .replace(/const STAMP = "[^"]*";/, 'const STAMP = "";');
  const digest = hash(JSON.stringify({ hashes, worker }));
  return { digest, files, hashes };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = buildOfflineManifest();
  fs.writeFileSync("dist/offline-files.json", JSON.stringify(manifest, null, 2) + "\n");
  const worker = fs.readFileSync("dist/sw.js", "utf8");
  fs.writeFileSync("dist/sw.js", worker.replace(/const STAMP = "[^"]*";/,
    `const STAMP = "${manifest.digest}";`));
  console.log(
  manifest.files.length +
    " files; " +
    (
      manifest.files.reduce((n, p) => n + fs.statSync("dist/" + p.slice(2)).size, 0) /
      1024 /
      1024
    ).toFixed(1) +
    " MB for full offline save.",
);
}
