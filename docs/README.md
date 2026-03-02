# Connect 4 (PWA)

A tiny **offline-first** Connect 4 game as a **Progressive Web App**.

## Run locally

You need a local web server (service workers won’t register from `file://`).

### Option A: Node
```bash
npx serve .
```

### Option B: Python
```bash
python -m http.server 5173
```
Then open:
- http://localhost:5173

## Deploy

Host the folder on any static host (GitHub Pages, Azure Static Web Apps, Netlify, etc.).

## Features
- 2-player local play
- Optional CPU opponent (simple heuristic)
- Undo (undoes last move; in vs CPU it undoes both last moves)
- Installable PWA
- Works offline after first load

