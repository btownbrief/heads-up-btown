import fs from "node:fs";
import { decks } from "../dist/js/decks.js";
import { uniqueCards } from "../dist/js/engine.js";
import { levels } from "../dist/js/levels.js";
const stats = {
  decks: decks.length,
  localDecks: decks.filter((d) => d.group === "local").length,
  cardEntries: decks.reduce((n, d) => n + d.cards.length, 0),
  uniqueAnswers: uniqueCards(decks.flatMap((d) => d.cards)).length,
  forbiddenAnswers: uniqueCards(
    decks.flatMap((d) => d.cards).filter((c) => c.ban),
  ).length,
  photos: decks.flatMap((d) => d.cards).filter((c) => c.image).length,
  levels: levels.length,
};
fs.writeFileSync(
  "docs/content-inventory.json",
  JSON.stringify(
    {
      stats,
      decks: decks.map((d) => ({
        id: d.id,
        name: d.name,
        cards: d.cards.length,
        forbidden: d.cards.filter((c) => c.ban).length,
      })),
    },
    null,
    2,
  ) + "\n",
);
console.log(stats);
