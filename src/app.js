import {
  BOARD_COLS,
  BOARD_ROWS,
  PIECES,
  createInitialState,
  getDropInterval,
  getGhostPiece,
  getPieceCells,
  hardDrop,
  movePiece,
  pauseGame,
  resetGame,
  rotatePiece,
  softDrop,
  startGame,
  tick,
} from "./engine.js";

const STORAGE_KEY = "tetris-high-score";

const canvas = document.querySelector("[data-board]");
const context = canvas.getContext("2d");
const nextCanvas = document.querySelector("[data-next]");
const nextContext = nextCanvas.getContext("2d");
const scoreValue = document.querySelector("[data-score]");
const highScoreValue = document.querySelector("[data-high-score]");
const linesValue = document.querySelector("[data-lines]");
const levelValue = document.querySelector("[data-level]");
const statusLabel = document.querySelector("[data-status]");
const nextLabel = document.querySelector("[data-next-label]");
const startButton = document.querySelector("[data-start]");
const pauseButton = document.querySelector("[data-pause]");
const resetButton = document.querySelector("[data-reset]");
const controls = document.querySelectorAll("[data-control]");

const savedHighScore = readHighScore();
let state = createInitialState({ highScore: savedHighScore });
let timer = null;

const statusCopy = {
  ready: "待机",
  playing: "下落",
  paused: "暂停",
  gameover: "结束",
};

function readHighScore() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY) ?? "0");
  } catch {
    return 0;
  }
}

function persistHighScore() {
  try {
    localStorage.setItem(STORAGE_KEY, String(state.highScore));
  } catch {
    // Storage can be disabled in privacy modes; the game still runs.
  }
}

function scheduleTick() {
  clearTimeout(timer);
  if (state.status !== "playing") return;

  timer = setTimeout(() => {
    state = tick(state);
    persistHighScore();
    render();
    scheduleTick();
  }, getDropInterval(state.level));
}

function start() {
  state = startGame(state);
  persistHighScore();
  render();
  scheduleTick();
}

function pause() {
  state = pauseGame(state);
  render();
  scheduleTick();
}

function reset() {
  state = resetGame(state);
  render();
  scheduleTick();
}

function ensurePlaying() {
  if (state.status === "ready") start();
  return state.status === "playing";
}

function runControl(action) {
  if (action === "start") {
    start();
    return;
  }

  if (action === "pause") {
    state.status === "playing" ? pause() : start();
    return;
  }

  if (action === "reset") {
    reset();
    return;
  }

  if (!ensurePlaying()) return;

  const actions = {
    left: () => movePiece(state, -1),
    right: () => movePiece(state, 1),
    rotate: () => rotatePiece(state),
    soft: () => softDrop(state),
    hard: () => hardDrop(state),
  };

  const nextState = actions[action]?.();
  if (!nextState) return;

  state = nextState;
  persistHighScore();
  render();
  scheduleTick();
}

function render() {
  updateCanvasSize(canvas);
  updateCanvasSize(nextCanvas);
  drawBoard();
  drawNextPiece();

  scoreValue.textContent = formatNumber(state.score, 6);
  highScoreValue.textContent = formatNumber(state.highScore, 6);
  linesValue.textContent = formatNumber(state.lines, 2);
  levelValue.textContent = formatNumber(state.level, 2);
  statusLabel.textContent = statusCopy[state.status];
  nextLabel.textContent = state.next.type;

  document.body.dataset.state = state.status;
  startButton.disabled = state.status === "playing";
  pauseButton.disabled = state.status === "ready" || state.status === "gameover";
}

function updateCanvasSize(target) {
  const rect = target.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));

  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
}

function drawBoard() {
  const metrics = getBoardMetrics();

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawCabinetBackground(context, canvas.width, canvas.height);
  drawGrid(metrics);
  drawLockedCells(metrics);
  drawGhost(metrics);
  drawPiece(context, getPieceCells(state.active), metrics, PIECES[state.active.type].color, 1);
  drawOverlay();
}

function getBoardMetrics() {
  const cell = Math.min(canvas.width / BOARD_COLS, canvas.height / BOARD_ROWS);
  const width = cell * BOARD_COLS;
  const height = cell * BOARD_ROWS;

  return {
    cell,
    x: (canvas.width - width) / 2,
    y: (canvas.height - height) / 2,
    width,
    height,
  };
}

function drawCabinetBackground(targetContext, width, height) {
  const gradient = targetContext.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#101621");
  gradient.addColorStop(0.52, "#090c11");
  gradient.addColorStop(1, "#16120d");
  targetContext.fillStyle = gradient;
  targetContext.fillRect(0, 0, width, height);
}

function drawGrid({ cell, x, y, width, height }) {
  context.save();
  context.translate(x, y);
  context.fillStyle = "rgba(245, 247, 237, 0.035)";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(232, 239, 228, 0.08)";
  context.lineWidth = Math.max(1, canvas.width / 880);

  for (let col = 0; col <= BOARD_COLS; col += 1) {
    const px = Math.round(col * cell) + 0.5;
    context.beginPath();
    context.moveTo(px, 0);
    context.lineTo(px, height);
    context.stroke();
  }

  for (let row = 0; row <= BOARD_ROWS; row += 1) {
    const py = Math.round(row * cell) + 0.5;
    context.beginPath();
    context.moveTo(0, py);
    context.lineTo(width, py);
    context.stroke();
  }

  context.restore();
}

function drawLockedCells(metrics) {
  state.board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (!cell) return;
      drawCell(context, metrics, x, y, cell.color, 1);
    });
  });
}

function drawGhost(metrics) {
  if (state.status === "gameover") return;

  const ghost = getGhostPiece(state);
  drawPiece(context, getPieceCells(ghost), metrics, "#e8efe4", 0.18);
}

function drawPiece(targetContext, cells, metrics, color, alpha) {
  cells.forEach((cell) => {
    drawCell(targetContext, metrics, cell.x, cell.y, color, alpha);
  });
}

function drawCell(targetContext, metrics, x, y, color, alpha) {
  const inset = Math.max(2, metrics.cell * 0.08);
  const px = metrics.x + x * metrics.cell + inset;
  const py = metrics.y + y * metrics.cell + inset;
  const size = metrics.cell - inset * 2;

  targetContext.save();
  targetContext.globalAlpha = alpha;
  targetContext.fillStyle = color;
  roundedRect(targetContext, px, py, size, size, Math.max(3, metrics.cell * 0.08));
  targetContext.fill();
  targetContext.fillStyle = "rgba(255, 255, 255, 0.18)";
  targetContext.fillRect(px + size * 0.14, py + size * 0.12, size * 0.48, Math.max(1, size * 0.08));
  targetContext.restore();
}

function drawOverlay() {
  if (state.status === "playing") return;

  const copy = {
    ready: "READY",
    paused: "PAUSED",
    gameover: "TOP OUT",
  }[state.status];

  context.save();
  context.fillStyle = "rgba(6, 8, 12, 0.62)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f5f7ed";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `800 ${Math.max(26, canvas.width * 0.1)}px "Courier New", monospace`;
  context.fillText(copy, canvas.width / 2, canvas.height / 2);
  context.restore();
}

function drawNextPiece() {
  nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  drawCabinetBackground(nextContext, nextCanvas.width, nextCanvas.height);

  const cells = PIECES[state.next.type].rotations[0];
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const maxY = Math.max(...cells.map((cell) => cell.y));
  const cellSize = Math.min(
    nextCanvas.width / Math.max(4, maxX + 2),
    nextCanvas.height / Math.max(4, maxY + 2),
  );
  const metrics = {
    cell: cellSize,
    x: (nextCanvas.width - (maxX + 1) * cellSize) / 2,
    y: (nextCanvas.height - (maxY + 1) * cellSize) / 2,
  };

  drawPiece(nextContext, cells, metrics, PIECES[state.next.type].color, 1);
}

function roundedRect(targetContext, x, y, width, height, radius) {
  targetContext.beginPath();
  targetContext.moveTo(x + radius, y);
  targetContext.arcTo(x + width, y, x + width, y + height, radius);
  targetContext.arcTo(x + width, y + height, x, y + height, radius);
  targetContext.arcTo(x, y + height, x, y, radius);
  targetContext.arcTo(x, y, x + width, y, radius);
  targetContext.closePath();
}

function formatNumber(value, length) {
  return String(value).padStart(length, "0");
}

startButton.addEventListener("click", () => runControl("start"));
pauseButton.addEventListener("click", () => runControl("pause"));
resetButton.addEventListener("click", () => runControl("reset"));

controls.forEach((button) => {
  button.addEventListener("click", () => {
    runControl(button.dataset.control);
  });
});

window.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right",
    ArrowUp: "rotate",
    w: "rotate",
    W: "rotate",
    x: "rotate",
    X: "rotate",
    ArrowDown: "soft",
    s: "soft",
    S: "soft",
    " ": "hard",
    Enter: "start",
    p: "pause",
    P: "pause",
    Escape: "pause",
    r: "reset",
    R: "reset",
  };

  const action = keyMap[event.key];
  if (!action) return;

  event.preventDefault();
  runControl(action);
});

window.addEventListener("resize", render);
render();
