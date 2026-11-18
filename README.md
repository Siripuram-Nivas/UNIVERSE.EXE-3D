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

## Implemented (Milestone 3: Beautiful Chaos)
- **Two modes** (top bar): Sandbox, and Challenges. Entering a challenge stashes your sandbox; exiting restores it (positions, rotations, velocities, gravity, rules). Reset restarts the level while in a challenge.
- **Challenge 1, Gravity Escape:** a glowing sphere rolls under a shelf. Win when it enters the energy ring (a Rapier sensor) after you reverse gravity at the right moment. Launch/Throw are disabled.
- **Challenge 2, Chain Reaction:** the Chain Reaction rule is preloaded. Win when it has spawned 3 spheres from real collisions. Only rule-made spheres count.
- **Challenge 3, Quantum Launch:** nudge the sphere into the heavy cube; Quantum Kick fires and the sphere must reach the ring. The goal only counts after the kick has fired.
- Goal rings ignore every object except the tagged one and complete only once. Progress bar, hint, restart, exit, "Reality solved" overlay, solved levels remembered in localStorage.
- **Save / load:** 3 local slots (objects, rotations, velocities, gravity, bounciness, pause, rules), versioned and validated. Corrupt or oversized saves are rejected. Loaded bodies are rebuilt; physics sleep state is not restored, so a loaded world is close to, not identical with, the saved one.
- **Effects tied to real events:** reactor flares in the colour of each reality change, sparks when a rule fires / a level starts / a level is solved, pink ring on the selected object, violet vignette while time is frozen. Reduced motion disables the animated effects.
- **Clap control (optional):** "Human controls" in the left panel. Off by default; permission is requested only when you press Enable. A loud short sound flips gravity normal/reverse. It is a loudness heuristic, so noise can trigger it; adjust sensitivity. Audio is analysed locally (level only), never recorded or sent. Nudge buttons (+X, −X, +Z, −Z) were added for precise pushes.

## Not implemented (future, not started)
Blink-to-freeze with MediaPipe (deferred: needs a new dependency and a model download, and cannot be verified here). More levels, cloud saves, sharing, post-processing. Rule conditions, rules with several effects, object types other than sphere/cube.

## Live AI test (needs your own key; usage is billed by your provider)
```bash
cp .env.example .env     # set AI_ENABLED=true, OPENAI_API_KEY and OPENAI_MODEL (server-side only, never VITE_*)
npm run dev
```
The AI compiler is **off unless `AI_ENABLED=true`** and a key and model are set; the command bar label then changes from "(not configured)" to "(ready)". Try `when a cube hits the floor, make everything bouncy for 5 seconds`, then `make every planet explode into 1000 black holes` (it should be refused with an explanation). The endpoint is a Vercel-style function (`api/compile.ts`); on Vercel set the same variables in project settings. Static-only hosts (GitHub Pages, Netlify without functions) need the endpoint hosted separately, otherwise AI shows as unavailable.

## Architecture
`src/store.ts` (state) · `src/commands.ts` (exact commands) · `src/physicsRegistry.ts` (body registry) · `src/reality/*` (types, validator, engine, presets, compiler client, live host) · `src/challenges/*` (levels, reducer, sessions) · `src/world/*` (snapshot, saves) · `src/controls/*` (clap, microphone) · `api/compile.ts` (AI endpoint) · `src/scene/*` (3D world) · `src/ui/*` (overlays) · `tests/*`.

## How Kiro was used
- **Specs:** `.kiro/specs/universe-exe/` (Milestone 1), `.kiro/specs/reality-compiler/` (Milestone 2) and `.kiro/specs/beautiful-chaos/` (Milestone 3) hold requirements, design (schema, pipeline, safety limits, API boundary) and tasks. They scoped each milestone and deferred later work.
- **Steering:** `.kiro/steering/project.md` holds always-on rules (real 3D only, palette, no fake AI, state in the store, stay in the authorised milestone).

## Deploy
`npm run build` produces a static `dist/`.
- **Vercel (recommended, includes the AI endpoint):** import the repo (Vite preset: build `npm run build`, output `dist`). With no environment variables the app deploys with the AI compiler off; commands, recipes, challenges and saves all work. To enable AI also add `AI_ENABLED=true`, `OPENAI_API_KEY`, `OPENAI_MODEL`. Step-by-step and post-deploy checks: `docs/LAUNCH.md`.
- **Public AI warning:** the endpoint's rate limits are in-memory per server instance, so they are not a reliable abuse barrier. Before enabling AI on a public URL set a hard spend limit at your provider and add a Vercel Firewall rate-limit rule for `/api/compile`. Leave `AI_ENABLED` unset for a no-cost public demo.
- **Netlify / Cloudflare Pages / GitHub Pages:** static only. The app works; AI compilation shows as unavailable unless the endpoint is hosted elsewhere. For a GitHub Pages project site build with `npx vite build --base=/UNIVERSE.EXE-3D/`.

## Challenge, save and effects checklist (manual, not yet run in a browser)
1. Top bar: Challenges, then Play on "Gravity Escape". The shelf, ring and glowing sphere appear; objective and progress bar show. Click the sphere, wait about 5 s until it is past the shelf edge, run `reverse gravity`: it rises into the ring, the ring turns lime, sparks fire and "Reality solved" appears. Reversing at the very start must not solve it.
2. Replay, then Exit: the sandbox comes back exactly as you left it. Next: "Chain Reaction": select the lone sphere and press Nudge +X; yellow-tinted spheres appear and the bar reaches 3/3.
3. "Quantum Launch": select the sphere, Nudge +X. It hits the cube, flies up and the ring completes. Launch/Throw are greyed out.
4. During a level: spawn buttons, clear, rule editing and saving are disabled. Reset restarts the level.
5. Sandbox: spawn a few objects, Save to slot 1, Reset world, Load slot 1: objects return with their motion. Delete the slot. Corrupt it in dev tools (`localStorage`), reload: the slot shows "corrupted" and loading is refused.
6. Freeze time: violet vignette, reactor and ring stop. Selecting an object shows the pink ring.
7. Clap control (needs a microphone): Enable, allow permission, clap once: gravity flips. Speak or play music: it should not flip repeatedly. Disable: the browser's recording indicator goes away. Deny permission: the status says denied and nothing else breaks.

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
`npm test`: 110 tests, all passing (105 from Milestones 1 to 3, plus 5 from Milestone 4: AI enable flag, cross-site and oversized request rejection, stale goal events, cross-level progress isolation, stale sparks). `npm run build` passes. In-browser behavior, the visual effects, the live microphone and the live AI call are **unverified**.

## Known gaps
- **No `LICENSE` file: release blocker.** The project owner must choose a license (e.g. MIT) and add it. Hackathon rules require an open-source license.
- JS payload is still about 3 MB (1 MB gzipped), but it is now split: a 214 KB entry chunk paints the interface, then `three` (667 KB), `Scene` (189 KB) and `rapier` (2.06 MB) load in parallel. 2 MB of that is Rapier's WASM embedded as base64 by `@dimforge/rapier3d-compat`, which `@react-three/rapier` requires, so it cannot be shrunk without replacing the physics wrapper.
- Automated tests cover logic and headless Rapier behavior, not the rendered scene or the React UI.
- AI rate limits are in-memory and best effort on serverless hosts.

## Release status (kept honest)
| State | Status |
|---|---|
| CODE VERIFIED (tests + build) | Yes: 110 tests, `npm run build`, `npm audit --omit=dev` found 0 vulnerabilities |
| BROWSER VERIFIED | **No.** No interactive browser was available. Use the checklists in `docs/LAUNCH.md` |
| PRODUCTION VERIFIED | **No.** Nothing has been deployed |
| AI VERIFIED | **No.** The endpoint is tested only with mocked provider responses |
| HACKATHON READY | **No.** Needs LICENSE, deployment, browser verification, demo video, submission |
