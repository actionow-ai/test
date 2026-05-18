# Snake Relay

A small dependency-free snake game for the browser.

## Run

Use any static file server from the repository root:

```bash
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Test

```bash
npm test
```

The game logic lives in `src/engine.js`; the canvas UI lives in `src/app.js`.

## Catalog contract

The mini-games MVP catalog data lives in `src/catalog.js`.

- `gameCatalog` contains the initial Web/H5 seeds: Snake and Tetris.
- `listGames({ query, category, tags, status })` returns sorted catalog records for homepage/search/filter views.
- `getGameBySlug(slug)` returns a detail/play record or `null`.

Each game record carries the MVP fields required by the aggregation shell:
`id`, `slug`, `title`, `description`, `category`, `tags`, `cover`,
`provider`, `playUrl`, `embedUrl`, `embedMode`, `orientation`, `status`,
and `updatedAt`.
