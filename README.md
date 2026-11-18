# UNIVERSE.EXE — Hack Reality

A browser 3D physics sandbox: **CHAMBER 001 — THE PARADOX CORE**. Real WebGL (Three.js via React Three Fiber) with Rapier 3D rigid-body physics. Language becomes validated physics rules.

## Run
```bash
npm install
npm run dev      # Vite dev server
npm test         # vitest
npm run build    # typecheck + production build into dist/
```

## Implemented (Milestone 1: sandbox)
- Orbit/zoom camera, chamber with floor grid, walls, ceiling, stars, decorative reactor (static collider, **exerts no gravity**).
- Spawn sphere, cube, heavy sphere (cap 60); clear; reset.
- Select by click or keyboard (`[` / `]` or Previous/Next buttons, `Esc` deselects). Throw, Push, Launch up, Spin apply real impulses; failures are reported.
- Gravity: normal / zero / reverse + magnitude. Freeze/resume time (physics, reactor and star twinkle stop; positions are preserved). "Everything bouncy".
- Command bar with nine exact deterministic commands (not AI): `reverse gravity`, `zero gravity`, `normal gravity`, `freeze time`, `resume time`, `spawn sphere`, `spawn cube`, `make everything bouncy`, `reset universe`.
- Low-quality rendering toggle, error screen if WebGL/WASM fails.

## Implemented (Milestone 2: Reality Compiler)
- **Rule engine** (`src/reality/`): WHEN/THEN rules with triggers (collision: sphere/cube vs sphere/cube/floor, or one-shot activation) and effects (spawn, impulse, gravity, bounciness, visual burst), cooldowns and optional durations. Executed from real Rapier collision events.
- **Three recipes:** Chain Reaction (sphere+sphere spawns a sphere), Quantum Kick (sphere hits cube, sphere launched up), Gravity Glitch (cube hits floor, gravity reverses for 3 s). Each can be added, enabled, disabled and deleted independently.
- **Rule builder** and preset buttons in the left panel ("Reality recipes"), using the same validation and activation path as AI proposals.
- **AI compiler:** type a sentence that is not one of the nine exact commands. `/api/compile` asks one model, the result is validated server-side and again in the browser, shown as a preview, and added only after you press Activate. Exact commands never call a model. Without server credentials the UI says AI is not configured and everything else keeps working.
- **Safety:** object cap, rule cap (12), per-rule cooldown, 6 effects/s, collision de-duplication, spawn generation limit (3), clamped numbers, removed-body handling. Freezing time discards collision events and pauses cooldown and duration clocks. Reset clears rules, queue and timers.

## Not implemented (future, not started)
Challenges, save/load presets, gestures, post-processing, sharing. Rule conditions, rules with several effects, object types other than sphere/cube.

## Live AI test (needs your own key; usage is billed by your provider)
```bash
cp .env.example .env     # set OPENAI_API_KEY and OPENAI_MODEL (server-side only, never VITE_*)
npm run dev
```
The command bar label changes from "(not configured)" to "(ready)". Try `when a cube hits the floor, make everything bouncy for 5 seconds`, then `make every planet explode into 1000 black holes` (it should be refused with an explanation). The endpoint is a Vercel-style function (`api/compile.ts`); on Vercel set the same variables in project settings. Static-only hosts (GitHub Pages, Netlify without functions) need the endpoint hosted separately, otherwise AI shows as unavailable.

## Architecture
`src/store.ts` (state) · `src/commands.ts` (exact commands) · `src/physicsRegistry.ts` (body registry) · `src/reality/*` (types, validator, engine, presets, compiler client, live host) · `api/compile.ts` (AI endpoint) · `src/scene/*` (3D world) · `src/ui/*` (overlays) · `tests/*`.

## How Kiro was used
- **Specs:** `.kiro/specs/universe-exe/` (Milestone 1) and `.kiro/specs/reality-compiler/` (Milestone 2) hold requirements, design (schema, pipeline, safety limits, API boundary) and tasks. They scoped each milestone and deferred later work.
- **Steering:** `.kiro/steering/project.md` holds always-on rules (real 3D only, palette, no fake AI, state in the store, stay in the authorised milestone).

## Deploy
`npm run build` produces a static `dist/`.
- **Vercel (recommended, includes the AI endpoint):** import the repo, build command `npm run build`, output `dist`, add `OPENAI_API_KEY` and `OPENAI_MODEL`.
- **Netlify / Cloudflare Pages / GitHub Pages:** static only. The app works; AI compilation shows as unavailable unless the endpoint is hosted elsewhere. For a GitHub Pages project site build with `npx vite build --base=/UNIVERSE.EXE-3D/`.

## Browser test checklist (manual, not yet run)
1. Load: overlay disappears, 6 objects fall and settle, console has no errors.
2. Drag orbits, wheel zooms. Click an object: it highlights lime and the right panel shows position and speed. `]` selects the next object, `Esc` deselects.
3. Select an object, press Throw: it flies away from the camera.
4. `reverse gravity`: resting objects rise and stay under the ceiling. `zero gravity`: they drift. `normal gravity`: they fall.
5. `freeze time`: objects, reactor ring and stars stop. `resume time`: motion continues from the same positions.
6. `make everything bouncy`, spawn a cube: it bounces. Spawn to 60/60: the next spawn shows an error.
7. Add "Chain Reaction": two spheres colliding spawn a sphere near the impact. The count never passes 60 and chains stop after a few generations.
8. Add "Quantum Kick": a sphere hitting a cube is launched upward. Toggle it off: no effect. Delete it: it leaves the list.
9. Add "Gravity Glitch": a cube landing on the floor reverses gravity for 3 s, then restores it. With time frozen nothing fires.
10. Builder: WHEN activation THEN impulse up, Add rule: every object jumps once; the play button repeats it.
11. Type `when two cubes collide make everything bouncy`: without a key the message says AI is unavailable; with a key a preview appears and nothing happens until Activate.
12. `make it rain` lists supported commands. `reset universe` clears objects' state and all rules.

## Test status
`npm test`: 67 tests, all passing (18 from Milestone 1, plus rule validation, engine safety, store rules, mocked AI endpoint and client, and a headless Rapier collision-event integration test). `npm run build` passes. In-browser behavior and the live AI call are **unverified**.

## Known gaps
- No `LICENSE` file yet (choose one before public release).
- Large JS bundle (about 3 MB, 1 MB gzipped).
- Automated tests cover logic and headless Rapier behavior, not the rendered scene or the React UI.
- AI rate limits are in-memory and best effort on serverless hosts.
