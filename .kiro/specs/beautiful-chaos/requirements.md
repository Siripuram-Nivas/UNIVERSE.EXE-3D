# Beautiful Chaos — Requirements (Milestone 3)

Builds on Milestones 1 and 2. Everything stays inside the live 3D world (Three.js + Rapier).

1. **Two modes** — Sandbox (unchanged lab) and Challenges. Switching never corrupts the world.
2. **Three 3D challenges** — Gravity Escape (reach the ring with the target sphere), Chain Reaction (the rule spawns 3 spheres), Quantum Launch (Quantum Kick sends the sphere into the ring). Success comes from Rapier events only.
3. **Challenge engine** — id, title, objective, initial objects, scenery, preset rules, blocked actions, win condition, hint, restart, exit, completion state, progress display, success overlay.
4. **Goal zones** — Rapier sensor sphere with a glowing ring and particles. Only the tagged object counts; completion fires once.
5. **Sandbox preservation** — Entering a challenge stashes the sandbox; exiting restores it (positions, rotations, velocities, gravity, rules).
6. **Save / load** — 3 localStorage slots, versioned and validated JSON, object cap enforced, corrupt saves rejected safely, rules restored. No Rapier handles stored.
7. **Cinematic effects** tied to real events: reactor pulse on every reality change, sparks when a rule fires / a level starts / a level is solved, shockwave bursts, pink selection ring, frozen-time vignette. Reduced motion respected.
8. **Optional controls** — Clap-to-flip-gravity (heuristic, mic off by default, local only). Blink-to-freeze is deferred.
9. **No AI dependency** — Challenges, saves and effects work without any API key.

Out of scope: more levels, cloud saves, sharing, post-processing, gaze or identity features.
