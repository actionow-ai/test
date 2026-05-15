export const BOARD_COLS = 10;
export const BOARD_ROWS = 20;
export const PIECE_TYPES = ["I", "J", "L", "O", "S", "T", "Z"];

export const PIECES = {
  I: {
    color: "#44d9ff",
    rotations: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 0, y: 3 },
      ],
    ],
  },
  J: {
    color: "#4c6fff",
    rotations: [
      [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
      [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
      [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ],
      [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 2 },
      ],
    ],
  },
  L: {
    color: "#ff9f1c",
    rotations: [
      [
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
      [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
      [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 0, y: 2 },
      ],
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
    ],
  },
  O: {
    color: "#f7d64a",
    rotations: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
    ],
  },
  S: {
    color: "#55df79",
    rotations: [
      [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ],
    ],
  },
  T: {
    color: "#c77dff",
    rotations: [
      [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
      [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
      ],
      [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
      ],
      [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
    ],
  },
  Z: {
    color: "#ff4d6d",
    rotations: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
      [
        { x: 2, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 1, y: 2 },
      ],
    ],
  },
};

const LINE_SCORES = [0, 100, 300, 500, 800];
const WALL_KICKS = [0, -1, 1, -2, 2];

export function createEmptyBoard(rows = BOARD_ROWS, cols = BOARD_COLS) {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
}

export function createPieceBag(rng = Math.random) {
  const bag = [...PIECE_TYPES];

  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(index, Math.floor(rng() * (index + 1)));
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }

  return bag;
}

export function createInitialState({
  cols = BOARD_COLS,
  rows = BOARD_ROWS,
  highScore = 0,
  queue,
  rng = Math.random,
} = {}) {
  const seededQueue = fillQueue(queue ?? createPieceBag(rng), rng);
  const activeType = seededQueue.shift();
  const active = createPiece(activeType, cols);
  const finalQueue = fillQueue(seededQueue, rng);

  return {
    cols,
    rows,
    board: createEmptyBoard(rows, cols),
    active,
    next: createPiece(finalQueue[0], cols),
    queue: finalQueue,
    score: 0,
    highScore,
    lines: 0,
    level: 1,
    status: "ready",
  };
}

export function startGame(state) {
  if (state.status === "gameover") {
    return {
      ...createInitialState({
        cols: state.cols,
        rows: state.rows,
        highScore: state.highScore,
      }),
      status: "playing",
    };
  }

  if (state.status === "paused" || state.status === "ready") {
    return {
      ...state,
      status: "playing",
    };
  }

  return state;
}

export function pauseGame(state) {
  if (state.status !== "playing") return state;

  return {
    ...state,
    status: "paused",
  };
}

export function resetGame(state, options = {}) {
  return createInitialState({
    cols: state.cols,
    rows: state.rows,
    highScore: state.highScore,
    queue: options.queue,
    rng: options.rng ?? Math.random,
  });
}

export function movePiece(state, direction) {
  if (state.status !== "playing") return state;

  const candidate = {
    ...state.active,
    x: state.active.x + direction,
  };

  if (!isValidPosition(state.board, candidate, state.cols, state.rows)) return state;

  return {
    ...state,
    active: candidate,
  };
}

export function rotatePiece(state) {
  if (state.status !== "playing") return state;

  const rotations = PIECES[state.active.type].rotations.length;
  if (rotations === 1) return state;

  const rotation = (state.active.rotation + 1) % rotations;

  for (const kick of WALL_KICKS) {
    const candidate = {
      ...state.active,
      rotation,
      x: state.active.x + kick,
    };

    if (isValidPosition(state.board, candidate, state.cols, state.rows)) {
      return {
        ...state,
        active: candidate,
      };
    }
  }

  return state;
}

export function tick(state, options = {}) {
  if (state.status !== "playing") return state;
  return descendOrLock(state, { ...options, scoreDrop: 0 });
}

export function softDrop(state, options = {}) {
  if (state.status !== "playing") return state;
  return descendOrLock(state, { ...options, scoreDrop: 1 });
}

export function hardDrop(state, options = {}) {
  if (state.status !== "playing") return state;

  let distance = 0;
  let active = state.active;

  while (isValidPosition(
    state.board,
    { ...active, y: active.y + 1 },
    state.cols,
    state.rows,
  )) {
    active = { ...active, y: active.y + 1 };
    distance += 1;
  }

  return lockPiece(
    {
      ...state,
      active,
      score: state.score + distance * 2,
    },
    options,
  );
}

export function getGhostPiece(state) {
  let ghost = state.active;

  while (isValidPosition(
    state.board,
    { ...ghost, y: ghost.y + 1 },
    state.cols,
    state.rows,
  )) {
    ghost = { ...ghost, y: ghost.y + 1 };
  }

  return ghost;
}

export function getDropInterval(level) {
  return Math.max(90, 720 - (level - 1) * 58);
}

export function getPieceCells(piece) {
  return PIECES[piece.type].rotations[piece.rotation].map((cell) => ({
    x: piece.x + cell.x,
    y: piece.y + cell.y,
  }));
}

export function isValidPosition(board, piece, cols, rows) {
  return getPieceCells(piece).every((cell) => (
    cell.x >= 0 &&
    cell.x < cols &&
    cell.y >= 0 &&
    cell.y < rows &&
    board[cell.y][cell.x] === null
  ));
}

function descendOrLock(state, options) {
  const candidate = {
    ...state.active,
    y: state.active.y + 1,
  };

  if (isValidPosition(state.board, candidate, state.cols, state.rows)) {
    return {
      ...state,
      active: candidate,
      score: state.score + options.scoreDrop,
      highScore: Math.max(state.highScore, state.score + options.scoreDrop),
    };
  }

  return lockPiece(state, options);
}

function lockPiece(state, { rng = Math.random } = {}) {
  const board = state.board.map((row) => [...row]);

  for (const cell of getPieceCells(state.active)) {
    if (cell.y >= 0 && cell.y < state.rows) {
      board[cell.y][cell.x] = {
        type: state.active.type,
        color: PIECES[state.active.type].color,
      };
    }
  }

  const { board: clearedBoard, cleared } = clearLines(board, state.cols);
  const lines = state.lines + cleared;
  const level = Math.floor(lines / 10) + 1;
  const score = state.score + LINE_SCORES[cleared] * level;
  const highScore = Math.max(state.highScore, score);
  const { active, queue } = drawNextActive(state.queue, state.cols, rng);
  const nextState = {
    ...state,
    board: clearedBoard,
    active,
    next: createPiece(queue[0], state.cols),
    queue,
    score,
    highScore,
    lines,
    level,
    status: "playing",
  };

  if (!isValidPosition(nextState.board, nextState.active, state.cols, state.rows)) {
    return {
      ...nextState,
      status: "gameover",
    };
  }

  return nextState;
}

function clearLines(board, cols) {
  const remainingRows = board.filter((row) => row.some((cell) => cell === null));
  const cleared = board.length - remainingRows.length;
  const emptyRows = Array.from({ length: cleared }, () => Array.from({ length: cols }, () => null));

  return {
    board: [...emptyRows, ...remainingRows],
    cleared,
  };
}

function createPiece(type, cols) {
  const rotations = PIECES[type]?.rotations;
  if (!rotations) throw new Error(`Unknown tetromino type: ${type}`);

  const width = Math.max(...rotations[0].map((cell) => cell.x)) + 1;

  return {
    type,
    rotation: 0,
    x: Math.floor((cols - width) / 2),
    y: 0,
  };
}

function drawNextActive(queue, cols, rng) {
  const nextQueue = fillQueue(queue, rng);
  const activeType = nextQueue.shift();
  const queueWithPreview = fillQueue(nextQueue, rng);

  return {
    active: createPiece(activeType, cols),
    queue: queueWithPreview,
  };
}

function fillQueue(queue, rng) {
  const nextQueue = [...queue];

  while (nextQueue.length < 2) {
    nextQueue.push(...createPieceBag(rng));
  }

  return nextQueue;
}
