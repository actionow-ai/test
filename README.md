# Tetris Stack

A dependency-free browser Tetris game built with vanilla JavaScript and Canvas.

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
