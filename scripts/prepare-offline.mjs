import fs from "node:fs";
import path from "node:path";
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((d) =>
      d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)],
    );
}
const paths = walk("dist")
  .filter((p) => !p.endsWith("/sw.js") && !p.endsWith("/offline-files.json"))
  .map((p) => "./" + p.slice(5));
fs.writeFileSync("dist/offline-files.json", JSON.stringify(paths, null, 2));
console.log(
  paths.length +
    " files; " +
    (
      paths.reduce((n, p) => n + fs.statSync("dist/" + p.slice(2)).size, 0) /
      1024 /
      1024
    ).toFixed(1) +
    " MB for full offline save.",
);
