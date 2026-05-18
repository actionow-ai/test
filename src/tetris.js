export const TETROMINOES = {
  I: {
    color: "#49dce2",
    matrix: [[1, 1, 1, 1]],
  },
  O: {
    color: "#f0c541",
    matrix: [
      [1, 1],
      [1, 1],
    ],
  },
  T: {
    color: "#ba7cff",
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
    ],
  },
  S: {
    color: "#54e36b",
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
    ],
  },
  Z: {
    color: "#ff5c35",
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
    ],
  },
  J: {
    color: "#648cff",
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
    ],
  },
  L: {
    color: "#ff9f43",
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
    ],
  },
};

const TYPES = Object.keys(TETROMINOES);
const LINE_SCORES = [0, 100, 300, 500, 800];

export function createInitialTetrisState({
  cols = 10,
  rows = 20,
  highScore = 0,
  rng = Math.random,
} = {}) {
  const activeType = pickType(rng);
  const nextType = pickType(rng);

  return {
    cols,
    rows,
    board: createBoard(cols, rows),
    active: createPiece(activeType, 1, cols),
    next: createPreviewPiece(nextType, 2),
    pieceId: 2,
    score: 0,
    highScore,
    lines: 0,
    level: 1,
    status: "ready",
  };
}

export function startTetris(state) {
  if (state.status === "gameover") {
    return createInitialTetrisState({
      cols: state.cols,
      rows: state.rows,
      highScore: state.highScore,
    });
  }

  return {
    ...state,
    status: "playing",
  };
}

export function pauseTetris(state) {
  if (state.status !== "playing") return state;

  return {
    ...state,
    status: "paused",
  };
}

export function resetTetris(state, options = {}) {
  return createInitialTetrisState({
    cols: state.cols,
    rows: state.rows,
    highScore: state.highScore,
    rng: options.rng ?? Math.random,
  });
}

export function movePiece(state, direction) {
  const delta = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    down: { x: 0, y: 1 },
  }[direction];

  if (!delta || state.status === "gameover") return state;
  if (!isValidPosition(state.board, state.active, delta.x, delta.y)) return state;

  return {
    ...state,
    active: {
      ...state.active,
      x: state.active.x + delta.x,
      y: state.active.y + delta.y,
    },
  };
}

export function rotatePiece(state) {
  if (state.status === "gameover") return state;

  const matrix = rotateMatrix(state.active.matrix);
  const kicks = [0, -1, 1, -2, 2];
  const kick = kicks.find((offset) => isValidPosition(
    state.board,
    { ...state.active, matrix },
    offset,
    0,
  ));

  if (kick === undefined) return state;

  return {
    ...state,
    active: {
      ...state.active,
      matrix,
      x: state.active.x + kick,
    },
  };
}

export function stepTetris(state, { rng = Math.random } = {}) {
  if (state.status !== "playing") return state;

  if (isValidPosition(state.board, state.active, 0, 1)) {
    return movePiece(state, "down");
  }

  return lockPiece(state, { rng });
}

export function hardDrop(state, { rng = Math.random } = {}) {
  if (state.status !== "playing") return state;

  let distance = 0;
  let active = state.active;

  while (isValidPosition(state.board, active, 0, 1)) {
    active = {
      ...active,
      y: active.y + 1,
    };
    distance += 1;
  }

  return lockPiece(
    {
      ...state,
      active,
      score: state.score + distance * 2,
    },
    { rng },
  );
}

export function rotateMatrix(matrix) {
  return matrix[0].map((_, col) => matrix.map((row) => row[col]).reverse());
}

function lockPiece(state, { rng = Math.random } = {}) {
  const board = state.board.map((row) => [...row]);

  state.active.matrix.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return;
      const boardY = state.active.y + y;
      const boardX = state.active.x + x;
      if (boardY >= 0 && boardY < state.rows && boardX >= 0 && boardX < state.cols) {
        board[boardY][boardX] = state.active.color;
      }
    });
  });

  const { board: clearedBoard, cleared } = clearLines(board, state.cols);
  const lines = state.lines + cleared;
  const level = Math.floor(lines / 10) + 1;
  const score = state.score + LINE_SCORES[cleared] * state.level;
  const pieceId = state.pieceId + 1;
  const active = createPiece(state.next.type, state.next.id, state.cols);
  const next = createPreviewPiece(pickType(rng), pieceId);
  const status = isValidPosition(clearedBoard, active, 0, 0) ? "playing" : "gameover";
  const highScore = Math.max(state.highScore, score);

  return {
    ...state,
    board: clearedBoard,
    active,
    next,
    pieceId,
    score,
    highScore,
    lines,
    level,
    status,
  };
}

function clearLines(board, cols) {
  const remaining = board.filter((row) => row.some((cell) => !cell));
  const cleared = board.length - remaining.length;
  const emptyRows = Array.from({ length: cleared }, () => Array(cols).fill(null));

  return {
    board: [...emptyRows, ...remaining],
    cleared,
  };
}

function createBoard(cols, rows) {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

function createPiece(type, id, cols) {
  const definition = TETROMINOES[type];
  const matrix = cloneMatrix(definition.matrix);

  return {
    id,
    type,
    color: definition.color,
    matrix,
    x: Math.floor((cols - matrix[0].length) / 2),
    y: 0,
  };
}

function createPreviewPiece(type, id) {
  const definition = TETROMINOES[type];

  return {
    id,
    type,
    color: definition.color,
    matrix: cloneMatrix(definition.matrix),
  };
}

function cloneMatrix(matrix) {
  return matrix.map((row) => [...row]);
}

function pickType(rng) {
  const rawIndex = Math.floor(rng() * TYPES.length);
  const index = Math.max(0, Math.min(TYPES.length - 1, rawIndex));
  return TYPES[index];
}

function isValidPosition(board, piece, dx = 0, dy = 0) {
  return piece.matrix.every((row, y) => row.every((cell, x) => {
    if (!cell) return true;

    const boardX = piece.x + x + dx;
    const boardY = piece.y + y + dy;
    const outsideBoard = boardX < 0 || boardX >= board[0].length || boardY >= board.length;

    if (outsideBoard) return false;
    if (boardY < 0) return true;

    return !board[boardY][boardX];
  }));
}
