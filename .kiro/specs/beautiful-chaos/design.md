# Beautiful Chaos — Design

## Challenge engine (`src/challenges/`)
- `defs.ts`: data for each level (objects with optional `tag`/`vel`, static `blocks`, `goal`, `presets`, `ruleCooldownS`, `blockedPush`, `win`).
- `state.ts`: pure reducer `reduceChallenge(state, def, event)` with events `goal{tag}`, `spawn`, `fired`. Unrelated tags are ignored, completed levels ignore everything (no duplicate completion). Quantum Launch needs `fired` before a goal counts.
- `session.ts`: `enterChallenge` (stash sandbox once, replace world), `restartChallenge`, `exitChallenge` (restore stash), `switchMode`, `resetWorld` (restarts the level in a challenge, resets the sandbox otherwise).
- Events come from the 3D world: `GoalZone` sensor `onIntersectionEnter` (reads `userData.tag` of the intersecting body), rule engine `Host.spawn` (counts rule-made spheres only) and `Host.fired`.

## World replacement
`store.replaceWorld(world, extra)` swaps objects, rules, gravity, bounciness and pause in one update, re-ids rules, keeps object ids unique (`nextId` is raised above loaded ids), and bumps `epoch` and `resetCount`. `Scene` keys `Objects` and `ChallengeScene` by `epoch`, so all Rapier bodies are rebuilt and the engine clears its queue, cooldowns and timers. Used by challenges, sandbox restore and save loading.

## Levels (all verified solvable in headless Rapier with the app's material settings)
1. Gravity Escape: target sphere rolls at 1.5 m/s under a shelf. Reversing gravity too early traps it under the shelf; after about 4.5 s it slides out through the open gap and rises into the ring. Launch and Throw are disabled.
2. Chain Reaction: lone sphere + 3x3 cluster, rule cooldown 0.8 s. One 5 m/s nudge completes it in about 2.5 s in 16/16 seeded runs. Only rule spawns count.
3. Quantum Launch: target sphere, heavy cube, Quantum Kick. A nudge from 3 to 8 m/s reaches the ring. Needs the kick to have fired.
The reactor is visual only during challenges so it cannot block a path.

## Saves (`src/world/`)
`snapshot.ts` reads live bodies into plain data. `save.ts`: `SaveV1` schema, `validateSave` (never throws; clamps positions, rejects duplicate ids, bad kinds, non-finite numbers, more than 60 objects, wrong version; drops invalid rules), slot read/write/delete with an injectable `Storage`. Limitation: velocities and rotations are restored, but sleep state, contact caches and in-flight rule timers are not, so a loaded world is close to, not bit-identical with, the saved one.

## Effects
`src/effects.ts` is a tiny queue (no React state). `Sparks` is one pool of 96 additive points. `Reactor` flares in the colour of the latest burst event. `SelectionRing` follows the selected body via the registry. Frozen time adds a CSS vignette and pauses scene animation.

## Optional controls
`controls/clap.ts` (pure detector: adaptive baseline, short-transient check, cooldown, sensitivity) and `controls/mic.ts` (Web Audio, RMS only, injectable environment, full cleanup on stop and unmount). Blink freeze (MediaPipe Face Landmarker) is deferred: it needs a new dependency and a model download and cannot be verified here.

## Testing
`tests/rapierHarness.ts` rebuilds a level in headless Rapier (floor, walls, blocks, sensor, bodies, rule engine) and the tests play each solution. Pure-reducer, session, save, slot-storage and control tests run without WebGL.
