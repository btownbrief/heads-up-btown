import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve("dist");
const port = Number(process.env.HEADSUP_PORT || 5197);
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};
http
  .createServer((req, res) => {
    let name;
    try {
      name = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const f = path.resolve(root, "." + (name === "/" ? "/index.html" : name));
    if (!f.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const data = fs.readFileSync(f);
      res.writeHead(200, {
        "Content-Type": types[path.extname(f)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404).end("Not found");
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`Heads Up, Btown! → http://localhost:${port}`),
  );
