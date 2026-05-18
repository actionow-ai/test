import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import {
  gameCatalog,
  getGameBySlug,
  listGames,
} from "../src/catalog.js";

const requiredFields = [
  "id",
  "slug",
  "title",
  "description",
  "category",
  "tags",
  "cover",
  "provider",
  "playUrl",
  "embedUrl",
  "embedMode",
  "orientation",
  "status",
  "updatedAt",
];

test("catalog seeds exactly Snake and Tetris with the MVP contract fields", () => {
  assert.deepEqual(
    gameCatalog.map((game) => game.slug),
    ["snake", "tetris"],
  );

  for (const game of gameCatalog) {
    for (const field of requiredFields) {
      assert.ok(game[field], `${game.slug} missing ${field}`);
    }

    assert.equal(game.status, "published");
    assert.equal(game.embedMode, "iframe");
    assert.match(game.playUrl, /^\.\//);
    assert.match(game.embedUrl, /^\.\//);
    assert.ok(Array.isArray(game.tags));
    assert.ok(game.tags.length > 0);
  }
});

test("listGames returns published games sorted for catalog display", () => {
  const games = listGames();

  assert.deepEqual(
    games.map((game) => game.slug),
    ["snake", "tetris"],
  );
});

test("listGames supports category, tag, and text search filters", () => {
  assert.deepEqual(
    listGames({ category: "puzzle" }).map((game) => game.slug),
    ["tetris"],
  );
  assert.deepEqual(
    listGames({ tags: ["classic", "keyboard"] }).map((game) => game.slug),
    ["snake", "tetris"],
  );
  assert.deepEqual(
    listGames({ query: "方块" }).map((game) => game.slug),
    ["tetris"],
  );
});

test("getGameBySlug returns detail records and null for unknown games", () => {
  const snake = getGameBySlug("snake");

  assert.equal(snake.slug, "snake");
  assert.equal(snake.category, "arcade");
  assert.equal(getGameBySlug("missing-game"), null);
});

test("catalog cover assets exist for seeded games", async () => {
  for (const game of gameCatalog) {
    const path = game.cover.replace(/^\.\//, "");
    await access(new URL(`../${path}`, import.meta.url));
  }
});
