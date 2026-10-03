# matejpopovski.com — portfolio

Six hand-built, zero-build portfolio designs to choose from. The root `index.html` links to all of them.

| Folder | Design |
| --- | --- |
| `v1-deck/` | The Deck: particle name, projects as playing cards, a lab of toys, hidden terminal |
| `v2-desktop-os/` | MatejOS: a fake desktop operating system |
| `v3-swiss/` | Swiss Kinetic: bright poster typography that moves |
| `v4-galaxy/` | Galaxy: a 3D solar system of projects |
| `v5-sketchbook/` | Sketchbook: a hand-drawn engineering notebook |
| `v6-arcade/` | Arcade: a playable pixel game |

All versions read their content from [`shared/data.js`](shared/data.js).

## v1: The Deck

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
[`shared/data.js`](shared/data.js). Every version renders from it.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

Once you pick a design, either point the host at its folder, or move that folder's files to the root (and change `../shared/data.js` to `shared/data.js`).

**GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / root. The `.nojekyll` file is already here.

**Vercel / Netlify:** import the repo, no framework preset, no build command, output directory `.`.

## Structure

```
index.html           # design chooser
shared/data.js       # content for every version
v1-deck/             # index.html + assets/
v2-desktop-os/ … v6-arcade/
```
