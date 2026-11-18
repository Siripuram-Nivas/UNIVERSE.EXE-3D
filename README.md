# UNIVERSE.EXE — Hack Reality

A browser 3D physics sandbox: **CHAMBER 001 — THE PARADOX CORE**. Real WebGL (Three.js via React Three Fiber) with Rapier 3D rigid-body physics.

## Run
```bash
npm install
npm run dev        # Vite dev server
npm run build      # typecheck + production build
```

## Features (Milestone 1)
- Orbit/zoom camera, chamber with floor grid, walls, ceiling, stars, decorative reactor (static collider, **no gravitational pull**).
- Spawn sphere, cube, heavy sphere (cap 60); clear; reset.
- Click to select; Throw, Push, Launch up, Spin apply real impulses.
- Gravity: normal / zero / reverse + magnitude. Freeze/resume time. "Everything bouncy".
- Command bar (deterministic supported-command interpreter, **not an AI model**): `reverse gravity`, `zero gravity`, `normal gravity`, `freeze time`, `resume time`, `spawn sphere`, `spawn cube`, `make everything bouncy`, `reset universe`.
- Gear button toggles low-quality rendering.

## Architecture
`src/store.ts` (state) · `src/commands.ts` (interpreter) · `src/physicsRegistry.ts` (body registry) · `src/scene/*` (3D world) · `src/ui/*` (overlays). See `.kiro/specs/universe-exe/`.

## Manual verification checklist
1. Objects fall and collide on load; drag orbits, wheel zooms.
2. Click an object, press Throw: it flies away from the camera.
3. `reverse gravity`: objects rise to the ceiling and stay inside. `zero gravity`: they drift. `normal gravity`: they fall.
4. `freeze time`: everything stops; `resume time`: motion continues from the same positions.
5. `make everything bouncy`, then spawn a cube: bounces repeatedly.
6. `reset universe` restores 6 starting objects; unknown text lists available commands.
