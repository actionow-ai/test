import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialTetrisState,
  hardDrop,
  movePiece,
  rotatePiece,
  stepTetris,
} from "../src/tetris.js";

test("createInitialTetrisState spawns a playable board and next queue", () => {
  const state = createInitialTetrisState({ rng: () => 0 });

  assert.equal(state.cols, 10);
  assert.equal(state.rows, 20);
  assert.equal(state.status, "ready");
  assert.equal(state.active.type, "I");
  assert.equal(state.next.type, "I");
  assert.equal(state.board.length, 20);
  assert.equal(state.board[0].length, 10);
});

test("movePiece keeps tetrominoes inside the board", () => {
  let state = createInitialTetrisState({ rng: () => 0 });

  for (let index = 0; index < 8; index += 1) {
    state = movePiece(state, "left");
  }

  assert.equal(state.active.x, 0);
});

test("rotatePiece changes shape when rotation is valid", () => {
  const state = createInitialTetrisState({ rng: () => 2 / 7 });
  const next = rotatePiece(state);

  assert.notDeepEqual(next.active.matrix, state.active.matrix);
});

test("hardDrop locks a piece, scores, and spawns the next piece", () => {
  const state = createInitialTetrisState({
    rng: (() => {
      const values = [0, 1 / 7, 2 / 7];
      let index = 0;
      return () => values[index++] ?? 0;
    })(),
  });

  const dropped = hardDrop({ ...state, status: "playing" });

  assert.equal(dropped.status, "playing");
  assert.equal(dropped.score, 38);
  assert.equal(dropped.active.type, "O");
  assert.ok(dropped.board.some((row) => row.some(Boolean)));
});

test("stepTetris locks a piece when it can no longer fall", () => {
  const state = createInitialTetrisState({ rng: () => 0 });
  const nearFloor = {
    ...state,
    status: "playing",
    active: {
      ...state.active,
      y: 19,
    },
  };

  const next = stepTetris(nearFloor);

  assert.notEqual(next.active.id, nearFloor.active.id);
  assert.ok(next.board[19].some(Boolean));
});
