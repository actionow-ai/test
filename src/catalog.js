export const GAME_STATUSES = Object.freeze({
  published: "published",
  draft: "draft",
  unavailable: "unavailable",
});

export const EMBED_MODES = Object.freeze({
  iframe: "iframe",
});

export const ORIENTATIONS = Object.freeze({
  any: "any",
  portrait: "portrait",
  landscape: "landscape",
});

export const gameCatalog = Object.freeze([
  Object.freeze({
    id: "game_snake",
    slug: "snake",
    title: "贪吃蛇 Snake",
    description:
      "Classic grid snake built for quick Web/H5 play with keyboard and touch controls.",
    category: "arcade",
    tags: Object.freeze(["classic", "score", "keyboard", "touch"]),
    cover: "./assets/covers/snake.svg",
    coverAlt: "Snake game cover art",
    provider: "Actionow internal",
    playUrl: "./games/snake/index.html",
    embedUrl: "./games/snake/index.html",
    embedMode: EMBED_MODES.iframe,
    orientation: ORIENTATIONS.any,
    status: GAME_STATUSES.published,
    updatedAt: "2026-05-18",
    sortOrder: 10,
  }),
  Object.freeze({
    id: "game_tetris",
    slug: "tetris",
    title: "俄罗斯方块 Tetris",
    description:
      "Falling-block puzzle game for Web/H5 play with keyboard-first controls and mobile-friendly layout.",
    category: "puzzle",
    tags: Object.freeze(["classic", "blocks", "keyboard", "strategy"]),
    cover: "./assets/covers/tetris.svg",
    coverAlt: "Tetris game cover art",
    provider: "Actionow internal",
    playUrl: "./games/tetris/index.html",
    embedUrl: "./games/tetris/index.html",
    embedMode: EMBED_MODES.iframe,
    orientation: ORIENTATIONS.any,
    status: GAME_STATUSES.published,
    updatedAt: "2026-05-18",
    sortOrder: 20,
  }),
]);

const searchableFields = ["title", "description", "category", "provider"];

export function listGames({ category, tags = [], query, status = GAME_STATUSES.published } = {}) {
  const normalizedTags = tags.map(normalize);
  const normalizedQuery = normalize(query);

  return gameCatalog
    .filter((game) => !status || game.status === status)
    .filter((game) => !category || normalize(game.category) === normalize(category))
    .filter((game) => {
      if (normalizedTags.length === 0) return true;
      const gameTags = new Set(game.tags.map(normalize));
      return normalizedTags.every((tag) => gameTags.has(tag));
    })
    .filter((game) => {
      if (!normalizedQuery) return true;

      const text = [
        ...searchableFields.map((field) => game[field]),
        ...game.tags,
        game.slug,
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(normalizedQuery);
    })
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

export function getGameBySlug(slug) {
  return gameCatalog.find((game) => game.slug === slug) ?? null;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}
