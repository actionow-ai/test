export const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITES = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function sameCell(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function getNextDirection(current, requested) {
  if (!DIRECTIONS[requested]) return current;
  if (OPPOSITES[current] === requested) return current;
  return requested;
}

export function placeFood({ cols, rows, snake, rng = Math.random }) {
  const occupied = new Set(snake.map((cell) => `${cell.x}:${cell.y}`));
  const openCells = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      if (!occupied.has(`${x}:${y}`)) openCells.push({ x, y });
    }
  }

  if (openCells.length === 0) return null;

  const rawIndex = Math.floor(rng() * openCells.length);
  const index = Math.max(0, Math.min(openCells.length - 1, rawIndex));
  return openCells[index];
}

export function createInitialState({
  cols = 24,
  rows = 24,
  highScore = 0,
  rng = Math.random,
} = {}) {
  const center = {
    x: Math.floor(cols / 2),
    y: Math.floor(rows / 2),
  };
  const snake = [
    center,
    { x: center.x - 1, y: center.y },
    { x: center.x - 2, y: center.y },
  ];

  return {
    cols,
    rows,
    snake,
    direction: "right",
    nextDirection: "right",
    food: placeFood({ cols, rows, snake, rng }),
    score: 0,
    highScore,
    status: "ready",
  };
}

export function queueDirection(state, requested) {
  return {
    ...state,
    nextDirection: getNextDirection(state.direction, requested),
  };
}

export function startGame(state) {
  if (state.status === "gameover" || state.status === "won") {
    return createInitialState({
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
    rng: options.rng ?? Math.random,
  });
}

export function stepGame(state, { rng = Math.random } = {}) {
  if (state.status !== "playing") return state;

  const direction = getNextDirection(state.direction, state.nextDirection);
  const delta = DIRECTIONS[direction];
  const head = state.snake[0];
  const nextHead = {
    x: head.x + delta.x,
    y: head.y + delta.y,
  };

  const hitWall =
    nextHead.x < 0 ||
    nextHead.y < 0 ||
    nextHead.x >= state.cols ||
    nextHead.y >= state.rows;

  if (hitWall) return finishGame(state, direction);

  const ateFood = state.food !== null && sameCell(nextHead, state.food);
  const collisionBody = ateFood ? state.snake : state.snake.slice(0, -1);
  const hitSelf = collisionBody.some((cell) => sameCell(cell, nextHead));

  if (hitSelf) return finishGame(state, direction);

  const snake = [nextHead, ...state.snake];
  if (!ateFood) snake.pop();

  const score = ateFood ? state.score + 10 : state.score;
  const won = snake.length >= state.cols * state.rows;

  return {
    ...state,
    snake,
    direction,
    nextDirection: direction,
    food: won
      ? null
      : ateFood
        ? placeFood({ cols: state.cols, rows: state.rows, snake, rng })
        : state.food,
    score,
    highScore: Math.max(state.highScore, score),
    status: won ? "won" : "playing",
  };
}

function finishGame(state, direction) {
  return {
    ...state,
    direction,
    nextDirection: direction,
    highScore: Math.max(state.highScore, state.score),
    status: "gameover",
  };
}
