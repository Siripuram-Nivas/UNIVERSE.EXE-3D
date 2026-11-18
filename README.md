# UNIVERSE.EXE — Hack Reality

A browser 3D physics sandbox: **CHAMBER 001 — THE PARADOX CORE**. Real WebGL (Three.js via React Three Fiber) with Rapier 3D rigid-body physics. No backend, no AI, no API keys.

## Run
```bash
npm install
npm run dev      # Vite dev server
npm test         # vitest: store, command interpreter, headless Rapier checks
npm run build    # typecheck + production build into dist/
```

## Implemented (Milestone 1)
- Orbit/zoom camera, chamber with floor grid, walls, ceiling, stars, decorative reactor (static collider, **exerts no gravity**).
- Spawn sphere, cube, heavy sphere (cap 60); clear; reset.
- Select by click or keyboard (`[` / `]` or Previous/Next buttons, `Esc` deselects). Throw, Push, Launch up, Spin apply real impulses; failures are reported.
- Gravity: normal / zero / reverse + magnitude. Freeze/resume time (physics, reactor and star twinkle all stop; positions are preserved). "Everything bouncy" (existing and new bodies).
- Command bar: deterministic supported-command interpreter, **not an AI model**: `reverse gravity`, `zero gravity`, `normal gravity`, `freeze time`, `resume time`, `spawn sphere`, `spawn cube`, `make everything bouncy`, `reset universe`.
- Gear button: low-quality rendering (lower resolution). Error screen if WebGL/WASM fails.

## Not implemented (future, not started)
AI Reality Compiler, WHEN/THEN recipes, challenges, save/load presets, gestures, post-processing, sharing.

## Architecture
`src/store.ts` (state) · `src/commands.ts` (interpreter) · `src/physicsRegistry.ts` (body registry) · `src/scene/*` (3D world) · `src/ui/*` (overlays) · `tests/*`.

## How Kiro was used
- **Specs** (`.kiro/specs/universe-exe/`): requirements, design and task list scoped the work to Milestone 1 and explicitly deferred later milestones.
- **Steering** (`.kiro/steering/project.md`): always-on rules (real 3D only, palette, no fake AI, state in the store, stay in milestone) that guided every change.

## Deploy (static site)
`npm run build` produces a static `dist/`. Any static host works.
- **Netlify / Vercel / Cloudflare Pages:** build command `npm run build`, output directory `dist`.
- **GitHub Pages (project site):** `npx vite build --base=/UNIVERSE.EXE-3D/`, then publish `dist/`.

## Browser test checklist (manual)
1. Load: loading overlay disappears, 6 objects fall and settle. Console has no errors.
2. Drag orbits, wheel zooms. Click an object: it highlights lime and the right panel shows its position/speed.
3. Press `]`: selection moves to the next object. Press `Esc`: deselects.
4. Select an object, press Throw: it flies away from the camera.
5. `reverse gravity`: objects rise (including ones that were resting) and stay under the ceiling. `zero gravity`: they drift. `normal gravity`: they fall.
6. `freeze time`: objects, reactor ring and stars stop. `resume time`: motion continues from the same positions.
7. `make everything bouncy`: resting objects bounce when disturbed; newly spawned cubes bounce too.
8. Spawn until the count reads 60/60: the next spawn shows an error message.
9. `make it rain`: error lists supported commands. `reset universe`: back to 6 objects, normal gravity, running.

## Known gaps
- No `LICENSE` file yet (choose one before public release).
- Large JS bundle (about 3 MB, 1 MB gzipped).
- Automated tests cover logic and headless Rapier behavior, not the rendered scene.
