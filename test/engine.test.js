import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyBoard,
  createInitialState,
  getPieceCells,
  hardDrop,
  movePiece,
  rotatePiece,
  startGame,
  tick,
} from "../src/engine.js";

function filled(type = "X") {
  return { type };
}

test("createInitialState builds a centered 10x20 tetris board with a queued next piece", () => {
  const state = createInitialState({ queue: ["T", "I", "O"] });

  assert.equal(state.cols, 10);
  assert.equal(state.rows, 20);
  assert.equal(state.board.length, 20);
  assert.equal(state.board[0].length, 10);
  assert.equal(state.active.type, "T");
  assert.equal(state.active.x, 3);
  assert.equal(state.active.y, 0);
  assert.equal(state.next.type, "I");
  assert.equal(state.score, 0);
  assert.equal(state.lines, 0);
  assert.equal(state.level, 1);
  assert.equal(state.status, "ready");
});

test("movePiece shifts the active tetromino until the wall blocks it", () => {
  let state = startGame(createInitialState({ cols: 6, rows: 8, queue: ["O", "I"] }));

  state = movePiece(state, -1);
  state = movePiece(state, -1);
  state = movePiece(state, -1);

  assert.equal(state.active.x, 0);

  const blocked = movePiece(state, -1);

  assert.equal(blocked.active.x, 0);
});

test("rotatePiece rotates a tetromino and keeps all cells inside the board", () => {
  const state = startGame(createInitialState({ cols: 10, rows: 20, queue: ["T", "I"] }));

  const rotated = rotatePiece(state);

  assert.equal(rotated.active.rotation, 1);
  assert.notDeepEqual(getPieceCells(rotated.active), getPieceCells(state.active));
  assert.ok(getPieceCells(rotated.active).every((cell) => cell.x >= 0 && cell.x < state.cols));
});

test("tick drops the active piece by one row while the game is playing", () => {
  const state = startGame(createInitialState({ cols: 6, rows: 8, queue: ["O", "I"] }));

  const next = tick(state);

  assert.equal(next.active.y, 1);
  assert.equal(next.status, "playing");
});

test("hardDrop locks the piece, awards drop points, and spawns the next tetromino", () => {
  const state = startGame(createInitialState({ cols: 6, rows: 8, queue: ["O", "I", "T"] }));

  const next = hardDrop(state);

  assert.equal(next.active.type, "I");
  assert.equal(next.score, 12);
  assert.equal(next.board[6][2].type, "O");
  assert.equal(next.board[6][3].type, "O");
  assert.equal(next.board[7][2].type, "O");
  assert.equal(next.board[7][3].type, "O");
});

test("locking a piece clears completed lines and scores by tetris line rules", () => {
  const board = createEmptyBoard(4, 4);
  board[3][0] = filled();
  board[3][1] = filled();

  const state = startGame({
    ...createInitialState({ cols: 4, rows: 4, queue: ["O", "I"] }),
    board,
    active: { type: "O", rotation: 0, x: 2, y: 2 },
  });

  const next = hardDrop(state);

  assert.equal(next.lines, 1);
  assert.equal(next.score, 100);
  assert.deepEqual(next.board[0], [null, null, null, null]);
  assert.equal(next.board[3][2].type, "O");
  assert.equal(next.board[3][3].type, "O");
});

test("spawning into occupied cells ends the game", () => {
  const board = createEmptyBoard(4, 4);
  board[0][1] = filled("Z");

  const state = startGame({
    ...createInitialState({ cols: 4, rows: 4, queue: ["O", "O"] }),
    board,
    active: { type: "O", rotation: 0, x: 2, y: 2 },
  });

  const next = hardDrop(state);

  assert.equal(next.status, "gameover");
  assert.equal(next.active.type, "O");
});
