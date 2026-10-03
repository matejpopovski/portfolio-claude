# matejpopovski.com — portfolio

A hand-built, zero-dependency portfolio. Open `index.html` and it runs; no build step.

**What's in it**

- **Hero** — the name drawn as ~5,000 particles that dodge your cursor and scatter on click.
- **Work** — every project is a playing card. The deck deals itself, hover to lift a card, click to flip it open, or shuffle the whole hand.
- **Lab** — three toys remixed from real projects:
  - a robot that explores an unknown room with lidar, an occupancy grid and A* replanning (click to give it a goal),
  - a playable Wordle,
  - a CPU vs GPU MNIST training race.
- **Terminal** — press <kbd>`</kbd> anywhere. Try `help`, `projects`, `open 1`, `sudo hire matej`.
- Konami code for a surprise. Respects `prefers-reduced-motion`.

## Editing content

Everything you'd want to change (bio, facts, skills, projects, links, Wordle words) lives in
[`assets/js/data.js`](assets/js/data.js). Add a project there and it becomes a new card.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

**GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / root. The `.nojekyll` file is already here.

**Vercel / Netlify:** import the repo, no framework preset, no build command, output directory `.`.

## Structure

```
index.html
assets/css/style.css
assets/js/data.js    # content
assets/js/main.js    # interactions
```
