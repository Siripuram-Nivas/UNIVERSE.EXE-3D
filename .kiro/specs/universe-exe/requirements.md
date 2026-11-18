# UNIVERSE.EXE — Requirements (Milestone 1)

Browser-based 3D physics sandbox ("CHAMBER 001 — THE PARADOX CORE"). Real Three.js/WebGL rendering and Rapier 3D rigid-body physics only.

## Requirements

1. **Scene** — On load the app renders a live 3D chamber (perspective camera, orbit/zoom, lighting, floor grid, boundaries, central reactor, stars).
2. **Physics** — Spheres and cubes are Rapier dynamic bodies that fall, collide with each other, the floor, walls and ceiling, and respond to impulses. Bodies cannot leave the chamber.
3. **Interaction** — Click selects an object; Throw / Push / Launch up / Spin apply real impulses; spawn sphere, cube, heavy sphere; clear objects; reset universe. Object count is capped (60).
4. **Gravity** — Normal, zero and reverse modes plus magnitude slider; changes affect existing bodies.
5. **Time** — Freeze/resume without moving bodies; reset restores the initial state.
6. **World parameter** — "Everything bouncy" raises restitution on all colliders.
7. **Commands** — Deterministic phrase interpreter (not AI) for: reverse gravity, zero gravity, normal gravity, freeze time, resume time, spawn sphere, spawn cube, make everything bouncy, reset universe. Unsupported input lists available commands.
8. **UI** — Violet Meltdown palette; top bar, left (laws), right (objects), bottom command bar; collapsible panels; keyboard accessible; reduced-motion respected; loading/success/error states.
9. **Honesty** — The reactor is decorative with a static collider and exerts no gravity. No AI calls, no backend, no API keys.

## Deferred (not authorised)
Milestone 2: AI Reality Compiler, WHEN/THEN recipes. Milestone 3: challenges, presets, gestures, post-processing, sharing.
