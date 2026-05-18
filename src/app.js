import {
  createInitialState,
  pauseGame,
  queueDirection,
  resetGame,
  startGame,
  stepGame,
} from "./engine.js";
import {
  createInitialTetrisState,
  hardDrop,
  movePiece,
  pauseTetris,
  resetTetris,
  rotatePiece,
  startTetris,
  stepTetris,
} from "./tetris.js";
import {
  games,
  getCategories,
  getGameBySlug,
  getOrientations,
  searchGames,
} from "./catalog.js";

const SNAKE_COLS = 24;
const SNAKE_ROWS = 24;
const TETRIS_COLS = 10;
const TETRIS_ROWS = 20;
const FAVORITES_KEY = "arcade-h5-favorites";
const RECENTS_KEY = "arcade-h5-recents";
const HIGH_SCORE_PREFIX = "arcade-h5-high-score";

const app = document.querySelector("[data-app]");
const filters = {
  query: "",
  category: "All",
  orientation: "All",
};
let favorites = new Set(readJSON(FAVORITES_KEY, []));
let recents = readJSON(RECENTS_KEY, []);
let runtimeCleanup = () => {};

app.addEventListener("click", (event) => {
  const categoryButton = event.target.closest("[data-filter-category]");
  if (categoryButton) {
    filters.category = categoryButton.dataset.filterCategory;
    renderRoute();
    return;
  }

  const orientationButton = event.target.closest("[data-filter-orientation]");
  if (orientationButton) {
    filters.orientation = orientationButton.dataset.filterOrientation;
    renderRoute();
    return;
  }

  const favoriteButton = event.target.closest("[data-favorite-slug]");
  if (favoriteButton) {
    toggleFavorite(favoriteButton.dataset.favoriteSlug);
    renderRoute();
    return;
  }

  const fullscreenButton = event.target.closest("[data-fullscreen]");
  if (fullscreenButton) {
    const target = document.querySelector("[data-runner]");
    if (target?.requestFullscreen) target.requestFullscreen();
  }
});

window.addEventListener("hashchange", renderRoute);
renderRoute();

function renderRoute() {
  runtimeCleanup();
  runtimeCleanup = () => {};

  const route = parseRoute();
  document.body.dataset.route = route.name;

  if (route.name === "detail") {
    renderDetail(route.slug);
    return;
  }

  if (route.name === "play") {
    renderPlay(route.slug);
    return;
  }

  if (route.name === "publish") {
    renderPublish();
    return;
  }

  renderHome();
}

function parseRoute() {
  const hash = window.location.hash || "#/";
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);

  if (parts[0] === "game" && parts[1]) return { name: "detail", slug: parts[1] };
  if (parts[0] === "play" && parts[1]) return { name: "play", slug: parts[1] };
  if (parts[0] === "publish") return { name: "publish" };
  return { name: "home" };
}

function renderHome() {
  const featured = games[0];
  const recentGames = recents.map(getGameBySlug).filter(Boolean);

  app.innerHTML = renderChrome(`
    <section class="hero-panel" aria-labelledby="hero-title">
      <div class="hero-copy">
        <span class="kicker">Web/H5 MVP</span>
        <h1 id="hero-title">站内小游戏台</h1>
        <p>首版聚焦两款可直接运行的本地 Canvas 游戏：贪吃蛇和俄罗斯方块。</p>
        <div class="hero-actions">
          <a class="button primary" href="${playHref(featured)}">启动贪吃蛇</a>
          <a class="button ghost" href="#/play/tetris">启动俄罗斯方块</a>
        </div>
      </div>
      <div class="hero-covers" aria-hidden="true">
        ${renderCover(games[0], "large")}
        ${renderCover(games[1], "small")}
      </div>
    </section>

    <section class="catalog-tools" aria-label="目录筛选">
      <label class="search-box">
        <span>Search</span>
        <input data-search type="search" value="${escapeHtml(filters.query)}" placeholder="snake, block, puzzle">
      </label>
      <div class="chip-row" aria-label="分类">
        ${getCategories().map((category) => renderFilterButton("category", category, filters.category)).join("")}
      </div>
      <div class="chip-row" aria-label="方向">
        ${getOrientations().map((orientation) => renderFilterButton("orientation", orientation, filters.orientation)).join("")}
      </div>
    </section>

    <section class="catalog-section" aria-labelledby="catalog-title">
      <div class="section-heading">
        <div>
          <span class="kicker">Catalog</span>
          <h2 id="catalog-title">可运行游戏</h2>
        </div>
        <strong data-result-count>${searchGames(filters).length} / ${games.length}</strong>
      </div>
      <div class="game-grid" data-results>
        ${renderGameCards(searchGames(filters))}
      </div>
    </section>

    <section class="rail-section" aria-label="最近与发布">
      <div class="recent-panel">
        <div class="section-heading compact">
          <div>
            <span class="kicker">Recent</span>
            <h2>最近启动</h2>
          </div>
        </div>
        <div class="mini-list">
          ${recentGames.length ? recentGames.map(renderMiniGame).join("") : "<p class=\"empty-copy\">还没有本地记录。</p>"}
        </div>
      </div>
      <a class="publish-panel" href="#/publish">
        <span class="kicker">Publishing</span>
        <strong>上架路径</strong>
        <span>Schema -> Canvas runner -> Tests -> PR</span>
      </a>
    </section>
  `);

  const search = app.querySelector("[data-search]");
  search.addEventListener("input", (event) => {
    filters.query = event.target.value;
    updateCatalogResults();
  });
}

function renderDetail(slug) {
  const game = getGameBySlug(slug);

  if (!game) {
    renderNotFound(slug);
    return;
  }

  app.innerHTML = renderChrome(`
    <section class="detail-layout" style="--accent: ${game.accent}">
      <div class="detail-art">
        ${renderCover(game, "detail")}
      </div>
      <article class="detail-copy">
        <a class="text-link" href="#/">← 目录</a>
        <span class="kicker">${escapeHtml(game.category)} / ${escapeHtml(game.orientation)}</span>
        <h1>${escapeHtml(game.title)}</h1>
        <p>${escapeHtml(game.description)}</p>
        <dl class="schema-list">
          <div><dt>Provider</dt><dd>${escapeHtml(game.provider)}</dd></div>
          <div><dt>Embed</dt><dd>${escapeHtml(game.embedMode)}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtml(game.status)}</dd></div>
          <div><dt>Updated</dt><dd>${escapeHtml(game.updatedAt)}</dd></div>
        </dl>
        <div class="tag-row">
          ${game.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        <div class="hero-actions">
          <a class="button primary" href="${playHref(game)}">站内运行</a>
          <button class="button ghost" type="button" data-favorite-slug="${game.slug}" aria-pressed="${favorites.has(game.slug)}">
            ${favorites.has(game.slug) ? "★ 已收藏" : "☆ 收藏"}
          </button>
        </div>
      </article>
    </section>
  `);
}

function renderPlay(slug) {
  const game = getGameBySlug(slug);

  if (!game) {
    renderNotFound(slug);
    return;
  }

  recordRecent(game.slug);
  app.innerHTML = renderChrome(`
    <section class="play-shell" data-runner style="--accent: ${game.accent}">
      <div class="play-topline">
        <div>
          <a class="text-link" href="#/game/${game.slug}">← ${escapeHtml(game.title)}</a>
          <h1>${escapeHtml(game.subtitle)}</h1>
        </div>
        <div class="play-actions">
          <button class="button ghost" type="button" data-fullscreen>Fullscreen</button>
          <a class="button ghost" href="#/">Exit</a>
        </div>
      </div>
      <div class="loading-card" data-game-host>
        <span class="loader"></span>
        <strong>Loading local canvas</strong>
      </div>
    </section>
  `);

  const host = app.querySelector("[data-game-host]");
  window.requestAnimationFrame(() => {
    if (game.slug === "snake") runtimeCleanup = initSnake(host);
    if (game.slug === "tetris") runtimeCleanup = initTetris(host);
  });
}

function renderPublish() {
  app.innerHTML = renderChrome(`
    <section class="publish-route">
      <a class="text-link" href="#/">← 目录</a>
      <span class="kicker">Publishing path</span>
      <h1>小游戏上架路径</h1>
      <div class="publish-grid">
        ${[
          ["1", "登记元数据", "在 src/catalog.js 增加 Game schema 字段：slug、title、category、tags、provider、playUrl、embedMode、orientation、status、updatedAt。"],
          ["2", "接入运行器", "优先接入本地 Canvas/Web/H5 runner；不可嵌入内容只能作为后续兜底。"],
          ["3", "补充验证", "为数据契约或游戏核心逻辑增加 node --test 覆盖，并跑通桌面和移动 H5 冒烟。"],
          ["4", "提交评审", "commit/PR 文案携带 agent 标识，交给 reviewer 按 MVP 清单验收。"],
        ].map(([number, title, copy]) => `
          <article>
            <span>${number}</span>
            <h2>${title}</h2>
            <p>${copy}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `);
}

function renderNotFound(slug) {
  app.innerHTML = renderChrome(`
    <section class="empty-state">
      <span class="kicker">Not found</span>
      <h1>没有找到 ${escapeHtml(slug)}</h1>
      <p>当前 MVP 只开放贪吃蛇和俄罗斯方块。</p>
      <a class="button primary" href="#/">返回目录</a>
    </section>
  `);
}

function renderChrome(content) {
  return `
    <header class="topbar">
      <a class="logo-mark" href="#/" aria-label="Arcade home">
        <span></span>
        <strong>H5 Arcade</strong>
      </a>
      <nav aria-label="主导航">
        <a href="#/">Catalog</a>
        <a href="#/play/snake">Snake</a>
        <a href="#/play/tetris">Tetris</a>
        <a href="#/publish">Publish</a>
      </nav>
    </header>
    <main class="page-frame">
      ${content}
    </main>
  `;
}

function renderFilterButton(kind, value, activeValue) {
  return `
    <button
      type="button"
      class="chip${value === activeValue ? " is-active" : ""}"
      data-filter-${kind}="${escapeHtml(value)}"
      aria-pressed="${value === activeValue}"
    >${escapeHtml(formatLabel(value))}</button>
  `;
}

function updateCatalogResults() {
  const matches = searchGames(filters);
  const results = app.querySelector("[data-results]");
  const count = app.querySelector("[data-result-count]");

  if (results) results.innerHTML = renderGameCards(matches);
  if (count) count.textContent = `${matches.length} / ${games.length}`;
}

function renderGameCards(items) {
  if (!items.length) {
    return `
      <div class="empty-card">
        <span class="kicker">Empty</span>
        <strong>没有匹配的游戏</strong>
      </div>
    `;
  }

  return items.map(renderGameCard).join("");
}

function renderGameCard(game) {
  return `
    <article class="game-card" style="--accent: ${game.accent}">
      <a class="cover-link" href="#/game/${game.slug}" aria-label="查看 ${escapeHtml(game.title)}">
        ${renderCover(game, "card")}
      </a>
      <div class="game-card-copy">
        <span class="kicker">${escapeHtml(game.category)}</span>
        <h3>${escapeHtml(game.title)}</h3>
        <p>${escapeHtml(game.description)}</p>
        <div class="tag-row">
          ${game.tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      <div class="card-actions">
        <a class="button primary" href="${playHref(game)}">Play</a>
        <a class="button ghost" href="#/game/${game.slug}">Detail</a>
        <button
          class="icon-button"
          type="button"
          data-favorite-slug="${game.slug}"
          aria-label="收藏 ${escapeHtml(game.title)}"
          aria-pressed="${favorites.has(game.slug)}"
        >${favorites.has(game.slug) ? "★" : "☆"}</button>
      </div>
    </article>
  `;
}

function renderMiniGame(game) {
  return `
    <a class="mini-game" href="${playHref(game)}" style="--accent: ${game.accent}">
      <span></span>
      <strong>${escapeHtml(game.title)}</strong>
      <small>${escapeHtml(game.category)}</small>
    </a>
  `;
}

function renderCover(game, size) {
  return `
    <div class="game-cover cover-${size}" style="--accent: ${game.accent}">
      <img src="${escapeHtml(game.cover)}" alt="${escapeHtml(game.coverAlt)}">
      <strong>${escapeHtml(game.subtitle)}</strong>
    </div>
  `;
}

function playHref(game) {
  return game.shellPlayUrl ?? `#/play/${game.slug}`;
}

function formatLabel(value) {
  if (value === "All") return "All";
  return String(value).replace(/^\w/, (letter) => letter.toUpperCase());
}

function initSnake(host) {
  host.outerHTML = `
    <div class="game-runner snake-runner">
      <section class="stage" aria-label="贪吃蛇棋盘">
        <div class="score-strip" aria-live="polite">
          <div><span>Score</span><strong data-score>000</strong></div>
          <div><span>Best</span><strong data-high-score>000</strong></div>
          <div><span>Length</span><strong data-length>3</strong></div>
        </div>
        <canvas data-board width="720" height="720" aria-label="贪吃蛇棋盘"></canvas>
      </section>
      <aside class="runner-console" aria-label="贪吃蛇控制台">
        <div class="status-row">
          <span>Status</span>
          <strong data-status>Ready</strong>
        </div>
        <div class="action-row">
          <button type="button" data-start>Start</button>
          <button type="button" data-pause>Pause</button>
          <button type="button" data-reset>Reset</button>
        </div>
        <div class="pad" aria-label="方向控制">
          <button type="button" data-direction="up" aria-label="向上">↑</button>
          <button type="button" data-direction="left" aria-label="向左">←</button>
          <button type="button" data-direction="down" aria-label="向下">↓</button>
          <button type="button" data-direction="right" aria-label="向右">→</button>
        </div>
      </aside>
    </div>
  `;

  const runner = app.querySelector(".snake-runner");
  const canvas = runner.querySelector("[data-board]");
  const context = canvas.getContext("2d");
  const scoreValue = runner.querySelector("[data-score]");
  const highScoreValue = runner.querySelector("[data-high-score]");
  const lengthValue = runner.querySelector("[data-length]");
  const statusLabel = runner.querySelector("[data-status]");
  const startButton = runner.querySelector("[data-start]");
  const pauseButton = runner.querySelector("[data-pause]");
  const resetButton = runner.querySelector("[data-reset]");
  const directionButtons = runner.querySelectorAll("[data-direction]");
  const storageKey = `${HIGH_SCORE_PREFIX}-snake`;
  const savedHighScore = Number(localStorage.getItem(storageKey) ?? "0");
  let state = createInitialState({ cols: SNAKE_COLS, rows: SNAKE_ROWS, highScore: savedHighScore });
  let timer = null;

  const statusCopy = {
    ready: "Ready",
    playing: "Running",
    paused: "Paused",
    gameover: "Crashed",
    won: "Cleared",
  };

  const persistHighScore = () => {
    localStorage.setItem(storageKey, String(state.highScore));
  };

  const scheduleTick = () => {
    clearTimeout(timer);
    if (state.status !== "playing") return;

    timer = setTimeout(() => {
      state = stepGame(state);
      persistHighScore();
      render();
      scheduleTick();
    }, Math.max(68, 132 - Math.floor(state.score / 40) * 8));
  };

  const start = () => {
    state = startGame(state);
    render();
    scheduleTick();
  };

  const pause = () => {
    state = pauseGame(state);
    render();
    scheduleTick();
  };

  const reset = () => {
    state = resetGame(state);
    render();
    scheduleTick();
  };

  const setDirection = (direction) => {
    state = queueDirection(state, direction);
    if (state.status === "ready") start();
  };

  const keydown = (event) => {
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

    if (event.key === "r" || event.key === "R") reset();
  };

  const resize = () => render();
  const drawBoard = () => {
    const cell = canvas.width / state.cols;
    const boardHeight = cell * state.rows;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#10130f";
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(context, state.cols, state.rows, cell, boardHeight);
    drawFood(context, state.food, cell);
    drawSnake(context, state.snake, state.direction, cell);
    drawSnakeOverlay(context, state.status, canvas.width, canvas.height);
  };

  const render = () => {
    updateCanvasSize(canvas);
    drawBoard();
    scoreValue.textContent = String(state.score).padStart(3, "0");
    highScoreValue.textContent = String(state.highScore).padStart(3, "0");
    lengthValue.textContent = String(state.snake.length);
    statusLabel.textContent = statusCopy[state.status];
    startButton.disabled = state.status === "playing";
    pauseButton.disabled = state.status !== "playing";
  };

  startButton.addEventListener("click", start);
  pauseButton.addEventListener("click", pause);
  resetButton.addEventListener("click", reset);
  directionButtons.forEach((button) => {
    button.addEventListener("click", () => setDirection(button.dataset.direction));
  });
  window.addEventListener("keydown", keydown);
  window.addEventListener("resize", resize);
  render();

  return () => {
    clearTimeout(timer);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("resize", resize);
  };
}

function initTetris(host) {
  host.outerHTML = `
    <div class="game-runner tetris-runner">
      <section class="stage tall-stage" aria-label="俄罗斯方块棋盘">
        <div class="score-strip" aria-live="polite">
          <div><span>Score</span><strong data-score>0000</strong></div>
          <div><span>Lines</span><strong data-lines>00</strong></div>
          <div><span>Level</span><strong data-level>01</strong></div>
        </div>
        <canvas data-board width="420" height="840" aria-label="俄罗斯方块棋盘"></canvas>
      </section>
      <aside class="runner-console" aria-label="俄罗斯方块控制台">
        <div class="next-box">
          <span>Next</span>
          <canvas data-next width="160" height="120" aria-label="下一个方块"></canvas>
        </div>
        <div class="status-row">
          <span>Status</span>
          <strong data-status>Ready</strong>
        </div>
        <div class="action-row">
          <button type="button" data-start>Start</button>
          <button type="button" data-pause>Pause</button>
          <button type="button" data-reset>Reset</button>
        </div>
        <div class="tetris-controls" aria-label="方块控制">
          <button type="button" data-move="left" aria-label="左移">←</button>
          <button type="button" data-rotate aria-label="旋转">↻</button>
          <button type="button" data-move="right" aria-label="右移">→</button>
          <button type="button" data-move="down" aria-label="下落">↓</button>
          <button type="button" data-drop aria-label="直接落下">⤓</button>
        </div>
      </aside>
    </div>
  `;

  const runner = app.querySelector(".tetris-runner");
  const canvas = runner.querySelector("[data-board]");
  const context = canvas.getContext("2d");
  const nextCanvas = runner.querySelector("[data-next]");
  const nextContext = nextCanvas.getContext("2d");
  const scoreValue = runner.querySelector("[data-score]");
  const linesValue = runner.querySelector("[data-lines]");
  const levelValue = runner.querySelector("[data-level]");
  const statusLabel = runner.querySelector("[data-status]");
  const startButton = runner.querySelector("[data-start]");
  const pauseButton = runner.querySelector("[data-pause]");
  const resetButton = runner.querySelector("[data-reset]");
  const moveButtons = runner.querySelectorAll("[data-move]");
  const rotateButton = runner.querySelector("[data-rotate]");
  const dropButton = runner.querySelector("[data-drop]");
  const storageKey = `${HIGH_SCORE_PREFIX}-tetris`;
  const savedHighScore = Number(localStorage.getItem(storageKey) ?? "0");
  let state = createInitialTetrisState({ cols: TETRIS_COLS, rows: TETRIS_ROWS, highScore: savedHighScore });
  let timer = null;

  const statusCopy = {
    ready: "Ready",
    playing: "Running",
    paused: "Paused",
    gameover: "Stacked",
  };

  const persistHighScore = () => {
    localStorage.setItem(storageKey, String(state.highScore));
  };

  const scheduleTick = () => {
    clearTimeout(timer);
    if (state.status !== "playing") return;

    timer = setTimeout(() => {
      state = stepTetris(state);
      persistHighScore();
      render();
      scheduleTick();
    }, Math.max(120, 620 - (state.level - 1) * 55));
  };

  const start = () => {
    state = startTetris(state);
    render();
    scheduleTick();
  };

  const pause = () => {
    state = pauseTetris(state);
    render();
    scheduleTick();
  };

  const reset = () => {
    state = resetTetris(state);
    render();
    scheduleTick();
  };

  const move = (direction) => {
    state = movePiece(state, direction);
    render();
  };

  const rotate = () => {
    state = rotatePiece(state);
    render();
  };

  const drop = () => {
    state = hardDrop(state);
    persistHighScore();
    render();
    scheduleTick();
  };

  const keydown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      move("left");
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      move("right");
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move("down");
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      rotate();
    }
    if (event.code === "Space") {
      event.preventDefault();
      drop();
    }
    if (event.key === "p" || event.key === "P") {
      state.status === "playing" ? pause() : start();
    }
    if (event.key === "r" || event.key === "R") reset();
  };

  const resize = () => render();
  const render = () => {
    updateCanvasSize(canvas);
    drawTetrisBoard(context, canvas, state);
    drawNextPiece(nextContext, nextCanvas, state.next);
    scoreValue.textContent = String(state.score).padStart(4, "0");
    linesValue.textContent = String(state.lines).padStart(2, "0");
    levelValue.textContent = String(state.level).padStart(2, "0");
    statusLabel.textContent = statusCopy[state.status];
    startButton.disabled = state.status === "playing";
    pauseButton.disabled = state.status !== "playing";
  };

  startButton.addEventListener("click", start);
  pauseButton.addEventListener("click", pause);
  resetButton.addEventListener("click", reset);
  moveButtons.forEach((button) => {
    button.addEventListener("click", () => move(button.dataset.move));
  });
  rotateButton.addEventListener("click", rotate);
  dropButton.addEventListener("click", drop);
  window.addEventListener("keydown", keydown);
  window.addEventListener("resize", resize);
  render();

  return () => {
    clearTimeout(timer);
    window.removeEventListener("keydown", keydown);
    window.removeEventListener("resize", resize);
  };
}

function drawGrid(context, cols, rows, cell, height) {
  context.strokeStyle = "rgba(235, 255, 210, 0.06)";
  context.lineWidth = Math.max(1, context.canvas.width / 900);

  for (let x = 0; x <= cols; x += 1) {
    const px = Math.round(x * cell) + 0.5;
    context.beginPath();
    context.moveTo(px, 0);
    context.lineTo(px, height);
    context.stroke();
  }

  for (let y = 0; y <= rows; y += 1) {
    const py = Math.round(y * cell) + 0.5;
    context.beginPath();
    context.moveTo(0, py);
    context.lineTo(context.canvas.width, py);
    context.stroke();
  }
}

function drawSnake(context, snake, direction, cell) {
  snake.forEach((segment, index) => {
    const inset = index === 0 ? cell * 0.08 : cell * 0.14;
    const radius = index === 0 ? cell * 0.28 : cell * 0.18;
    const x = segment.x * cell + inset;
    const y = segment.y * cell + inset;
    const size = cell - inset * 2;

    context.fillStyle = index === 0 ? "#d7ff54" : `hsl(${126 - index * 1.4} 72% 54%)`;
    roundedRect(context, x, y, size, size, radius);
    context.fill();

    if (index === 0) drawSnakeEyes(context, segment, direction, cell);
  });
}

function drawSnakeEyes(context, head, direction, cell) {
  const eyeRadius = cell * 0.07;
  const centerX = head.x * cell + cell / 2;
  const centerY = head.y * cell + cell / 2;
  const offset = cell * 0.18;
  const positions = direction === "left" || direction === "right"
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

function drawFood(context, food, cell) {
  if (!food) return;

  const x = food.x * cell + cell / 2;
  const y = food.y * cell + cell / 2;
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
  roundedRect(context, x + radius * 0.12, y - radius * 1.18, radius * 0.36, radius * 0.62, radius * 0.18);
  context.fill();
}

function drawSnakeOverlay(context, status, width, height) {
  if (status === "playing") return;

  context.save();
  context.fillStyle = "rgba(16, 19, 15, 0.48)";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#f7ffdf";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${Math.max(20, width * 0.05)}px "Trebuchet MS", Verdana, sans-serif`;

  const copy = {
    ready: "Press Start",
    paused: "Paused",
    gameover: "Game Over",
    won: "Board Cleared",
  }[status];
  context.fillText(copy, width / 2, height / 2);
  context.restore();
}

function drawTetrisBoard(context, canvas, state) {
  const cell = Math.min(canvas.width / state.cols, canvas.height / state.rows);
  const boardWidth = cell * state.cols;
  const boardHeight = cell * state.rows;
  const offsetX = (canvas.width - boardWidth) / 2;
  const offsetY = (canvas.height - boardHeight) / 2;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#10130f";
  context.fillRect(offsetX, offsetY, boardWidth, boardHeight);
  drawBlockGrid(context, state.cols, state.rows, cell, offsetX, offsetY);

  state.board.forEach((row, y) => {
    row.forEach((color, x) => {
      if (color) drawBlock(context, offsetX + x * cell, offsetY + y * cell, cell, color);
    });
  });

  state.active.matrix.forEach((row, y) => {
    row.forEach((cellValue, x) => {
      if (!cellValue) return;
      drawBlock(
        context,
        offsetX + (state.active.x + x) * cell,
        offsetY + (state.active.y + y) * cell,
        cell,
        state.active.color,
      );
    });
  });

  if (state.status !== "playing") {
    context.save();
    context.fillStyle = "rgba(16, 19, 15, 0.52)";
    context.fillRect(offsetX, offsetY, boardWidth, boardHeight);
    context.fillStyle = "#f7ffdf";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = `800 ${Math.max(20, boardWidth * 0.12)}px "Trebuchet MS", Verdana, sans-serif`;
    context.fillText(state.status === "gameover" ? "STACKED" : "READY", canvas.width / 2, canvas.height / 2);
    context.restore();
  }
}

function drawNextPiece(context, canvas, piece) {
  updateCanvasSize(canvas);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const cell = Math.min(canvas.width / 6, canvas.height / 4);
  const width = piece.matrix[0].length * cell;
  const height = piece.matrix.length * cell;
  const offsetX = (canvas.width - width) / 2;
  const offsetY = (canvas.height - height) / 2;

  piece.matrix.forEach((row, y) => {
    row.forEach((cellValue, x) => {
      if (cellValue) drawBlock(context, offsetX + x * cell, offsetY + y * cell, cell, piece.color);
    });
  });
}

function drawBlockGrid(context, cols, rows, cell, offsetX, offsetY) {
  context.strokeStyle = "rgba(247, 255, 223, 0.08)";
  context.lineWidth = Math.max(1, cell * 0.03);

  for (let x = 0; x <= cols; x += 1) {
    const px = Math.round(offsetX + x * cell) + 0.5;
    context.beginPath();
    context.moveTo(px, offsetY);
    context.lineTo(px, offsetY + rows * cell);
    context.stroke();
  }

  for (let y = 0; y <= rows; y += 1) {
    const py = Math.round(offsetY + y * cell) + 0.5;
    context.beginPath();
    context.moveTo(offsetX, py);
    context.lineTo(offsetX + cols * cell, py);
    context.stroke();
  }
}

function drawBlock(context, x, y, cell, color) {
  const inset = Math.max(1, cell * 0.08);

  context.fillStyle = color;
  roundedRect(context, x + inset, y + inset, cell - inset * 2, cell - inset * 2, cell * 0.12);
  context.fill();
  context.fillStyle = "rgba(255, 255, 255, 0.22)";
  roundedRect(context, x + inset * 1.5, y + inset * 1.5, cell - inset * 3, cell * 0.18, cell * 0.08);
  context.fill();
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function updateCanvasSize(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function toggleFavorite(slug) {
  favorites = new Set(favorites);
  favorites.has(slug) ? favorites.delete(slug) : favorites.add(slug);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
}

function recordRecent(slug) {
  recents = [slug, ...recents.filter((item) => item !== slug)].slice(0, 4);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
}

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
