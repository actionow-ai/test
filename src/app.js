import {
  createInitialState,
  pauseGame,
  queueDirection,
  resetGame,
  startGame,
  stepGame,
} from "./engine.js";

const COLS = 24;
const ROWS = 24;
const STORAGE_KEY = "snake-game-high-score";

const canvas = document.querySelector("[data-board]");
const context = canvas.getContext("2d");
const scoreValue = document.querySelector("[data-score]");
const highScoreValue = document.querySelector("[data-high-score]");
const lengthValue = document.querySelector("[data-length]");
const statusLabel = document.querySelector("[data-status]");
const startButton = document.querySelector("[data-start]");
const pauseButton = document.querySelector("[data-pause]");
const resetButton = document.querySelector("[data-reset]");
const directionButtons = document.querySelectorAll("[data-direction]");

const savedHighScore = Number(localStorage.getItem(STORAGE_KEY) ?? "0");
let state = createInitialState({ cols: COLS, rows: ROWS, highScore: savedHighScore });
let timer = null;

const statusCopy = {
  ready: "Ready",
  playing: "Running",
  paused: "Paused",
  gameover: "Crashed",
  won: "Cleared",
};

function persistHighScore() {
  localStorage.setItem(STORAGE_KEY, String(state.highScore));
}

function tickDelay() {
  return Math.max(68, 132 - Math.floor(state.score / 40) * 8);
}

function scheduleTick() {
  clearTimeout(timer);
  if (state.status !== "playing") return;

  timer = setTimeout(() => {
    state = stepGame(state);
    persistHighScore();
    render();
    scheduleTick();
  }, tickDelay());
}

function start() {
  state = startGame(state);
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

function setDirection(direction) {
  state = queueDirection(state, direction);
  if (state.status === "ready") start();
}

function render() {
  updateCanvasSize();
  drawBoard();
  scoreValue.textContent = String(state.score).padStart(3, "0");
  highScoreValue.textContent = String(state.highScore).padStart(3, "0");
  lengthValue.textContent = String(state.snake.length);
  statusLabel.textContent = statusCopy[state.status];

  document.body.dataset.state = state.status;
  startButton.disabled = state.status === "playing";
  pauseButton.disabled = state.status !== "playing";
}

function updateCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function drawBoard() {
  const cell = canvas.width / state.cols;
  const boardHeight = cell * state.rows;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#10130f";
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid(cell, boardHeight);
  drawFood(cell);
  drawSnake(cell);
  drawOverlay();
}

function drawGrid(cell, boardHeight) {
  context.strokeStyle = "rgba(235, 255, 210, 0.06)";
  context.lineWidth = Math.max(1, canvas.width / 900);

  for (let x = 0; x <= state.cols; x += 1) {
    const px = Math.round(x * cell) + 0.5;
    context.beginPath();
    context.moveTo(px, 0);
    context.lineTo(px, boardHeight);
    context.stroke();
  }

  for (let y = 0; y <= state.rows; y += 1) {
    const py = Math.round(y * cell) + 0.5;
    context.beginPath();
    context.moveTo(0, py);
    context.lineTo(canvas.width, py);
    context.stroke();
  }
}

function drawSnake(cell) {
  state.snake.forEach((segment, index) => {
    const inset = index === 0 ? cell * 0.08 : cell * 0.14;
    const radius = index === 0 ? cell * 0.28 : cell * 0.18;
    const x = segment.x * cell + inset;
    const y = segment.y * cell + inset;
    const size = cell - inset * 2;

    context.fillStyle = index === 0 ? "#d7ff54" : `hsl(${126 - index * 1.4} 72% 54%)`;
    roundedRect(x, y, size, size, radius);
    context.fill();

    if (index === 0) drawEyes(segment, cell);
  });
}

function drawEyes(head, cell) {
  const eyeRadius = cell * 0.07;
  const centerX = head.x * cell + cell / 2;
  const centerY = head.y * cell + cell / 2;
  const offset = cell * 0.18;

  const positions = state.direction === "left" || state.direction === "right"
    ? [
        { x: centerX, y: centerY - offset },
        { x: centerX, y: centerY + offset },
      ]
    : [
        { x: centerX - offset, y: centerY },
        { x: centerX + offset, y: centerY },
      ];

  context.fillStyle = "#10130f";
  positions.forEach((eye) => {
    context.beginPath();
    context.arc(eye.x, eye.y, eyeRadius, 0, Math.PI * 2);
    context.fill();
  });
}

function drawFood(cell) {
  if (!state.food) return;

  const x = state.food.x * cell + cell / 2;
  const y = state.food.y * cell + cell / 2;
  const radius = cell * 0.32;

  const gradient = context.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.35,
    radius * 0.1,
    x,
    y,
    radius,
  );
  gradient.addColorStop(0, "#fff0a8");
  gradient.addColorStop(0.42, "#ff5c35");
  gradient.addColorStop(1, "#b5162d");

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#48d597";
  roundedRect(x + radius * 0.12, y - radius * 1.18, radius * 0.36, radius * 0.62, radius * 0.18);
  context.fill();
}

function drawOverlay() {
  if (state.status === "playing") return;

  context.save();
  context.fillStyle = "rgba(16, 19, 15, 0.48)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f7ffdf";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${Math.max(20, canvas.width * 0.05)}px "Trebuchet MS", Verdana, sans-serif`;

  const copy = {
    ready: "Press Start",
    paused: "Paused",
    gameover: "Game Over",
    won: "Board Cleared",
  }[state.status];
  context.fillText(copy, canvas.width / 2, canvas.height / 2);
  context.restore();
}

function roundedRect(x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

startButton.addEventListener("click", start);
pauseButton.addEventListener("click", pause);
resetButton.addEventListener("click", reset);

directionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDirection(button.dataset.direction);
  });
});

window.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right",
  };

  if (keyMap[event.key]) {
    event.preventDefault();
    setDirection(keyMap[event.key]);
  }

  if (event.code === "Space") {
    event.preventDefault();
    state.status === "playing" ? pause() : start();
  }

  if (event.key === "r" || event.key === "R") {
    reset();
  }
});

window.addEventListener("resize", render);
render();
