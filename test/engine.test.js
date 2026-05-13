import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialState,
  getNextDirection,
  stepGame,
} from "../src/engine.js";

test("createInitialState centers the snake and places food off the snake", () => {
  const state = createInitialState({ cols: 12, rows: 10, rng: () => 0.99 });

  assert.deepEqual(state.snake, [
    { x: 6, y: 5 },
    { x: 5, y: 5 },
    { x: 4, y: 5 },
  ]);
  assert.notDeepEqual(state.food, state.snake[0]);
  assert.equal(state.score, 0);
  assert.equal(state.status, "ready");
});

test("getNextDirection ignores direct reversals", () => {
  assert.equal(getNextDirection("right", "left"), "right");
  assert.equal(getNextDirection("right", "up"), "up");
  assert.equal(getNextDirection("up", "down"), "up");
});

test("stepGame moves forward without growing when food is not eaten", () => {
  const state = {
    cols: 8,
    rows: 8,
    snake: [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
    ],
    direction: "right",
    nextDirection: "right",
    food: { x: 6, y: 6 },
    score: 0,
    highScore: 0,
    status: "playing",
  };

  const next = stepGame(state, { rng: () => 0 });

  assert.deepEqual(next.snake, [
    { x: 4, y: 3 },
    { x: 3, y: 3 },
    { x: 2, y: 3 },
  ]);
  assert.equal(next.score, 0);
  assert.equal(next.status, "playing");
});

test("stepGame grows, scores, and moves food when eating", () => {
  const state = {
    cols: 8,
    rows: 8,
    snake: [
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
    ],
    direction: "right",
    nextDirection: "right",
    food: { x: 4, y: 3 },
    score: 0,
    highScore: 0,
    status: "playing",
  };

  const next = stepGame(state, { rng: () => 0.5 });

  assert.equal(next.snake.length, 4);
  assert.deepEqual(next.snake[0], { x: 4, y: 3 });
  assert.equal(next.score, 10);
  assert.equal(next.highScore, 10);
  assert.notDeepEqual(next.food, { x: 4, y: 3 });
});

test("stepGame ends the game when the snake hits a wall", () => {
  const state = {
    cols: 8,
    rows: 8,
    snake: [
      { x: 7, y: 3 },
      { x: 6, y: 3 },
      { x: 5, y: 3 },
    ],
    direction: "right",
    nextDirection: "right",
    food: { x: 2, y: 2 },
    score: 0,
    highScore: 20,
    status: "playing",
  };

  const next = stepGame(state);

  assert.equal(next.status, "gameover");
  assert.equal(next.highScore, 20);
});

test("stepGame ends the game when the snake hits itself", () => {
  const state = {
    cols: 8,
    rows: 8,
    snake: [
      { x: 4, y: 3 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
    ],
    direction: "up",
    nextDirection: "left",
    food: { x: 7, y: 7 },
    score: 30,
    highScore: 30,
    status: "playing",
  };

  const next = stepGame(state);

  assert.equal(next.status, "gameover");
});
