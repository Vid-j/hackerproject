# Hacked portal — AR.js + GLSL

Web AR piece: a **Hiro marker** defines the world root; the **camera feed** is redrawn through a **custom GLSL** chain (chromatic aberration, pixel blocks, scanlines, noise dissolve, subtle vertex warp). A small procedural **marker-world** accent sits on the anchor.

## Run locally (camera requires HTTPS or localhost)

From this folder:

```bash
npx --yes serve -l 8080
```

Open `http://localhost:8080` on your phone or desktop, allow camera access, and point at a **Hiro** marker (print or display on another screen). Official pattern: [AR.js Hiro marker](https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/hiro.png).

## Tuning

Query parameters (optional):

- `?glitch=0.5` — intensity `0`–`2` (default `1`)
- `?seed=12.3` — shifts noise phases for variation

Example: `http://localhost:8080/?glitch=1.2&seed=3`

## Stack (pinned in `index.html`)

- [A-Frame 1.4.2](https://aframe.io/)
- [AR.js 3.4.8](https://github.com/AR-js-org/AR.js/) (marker tracking)

## Artist statement (brief)

- **McKenzie Wark**: the intervention treats the live view as a site where **virtuality** (shader logic, compression, glitch) is pushed into the **actual** perceptual field—less a neutral window than a contested surface.
- **Hito Steyerl**: artifacts are closer to a **poor image** than a pristine feed—**pixelation, drift, and noise** are compositional, not accidental “quality” failures.
- **Tactical media**: the piece runs on **ordinary phones** and a **shared marker**, privileging reproducible, low-friction distribution over closed AR platforms.

## Project

Hacker Project — final project for .net art.
