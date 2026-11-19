# 🌌 UNIVERSE.EXE — Hack Reality

**What if the laws of physics were yours to rewrite?**

### [▶ Play Live Demo](https://universe-exe-3d-1.onrender.com/)

UNIVERSE.EXE is a browser-based, interactive 3D physics laboratory. Flip gravity, freeze time, write collision-driven **Reality Recipes**, solve three 3D physics challenges, and share your experiments as a link. Everything runs in real time on WebGL with a real rigid-body physics engine, and the whole app works without a login, a backend, or an API key.

Built for **Kiroween 2026** in the **Frankenstein** category and developed with **Kiro**. Stack: React Three Fiber, Three.js, Rapier and TypeScript.

[Screenshots](#screenshots) · [Break Reality](#break-reality) · [Features](#features) · [Challenges](#reality-challenges) · [How Kiro was used](#how-kiro-was-used) · [Architecture](#technology-and-architecture) · [Verification status](#verification-status) · [Install and deploy](#installation-and-deployment) · [Limitations](#known-limitations) · [License](#license)

> The live demo is hosted as a Render Static Site. It does **not** run the server-side AI endpoint, so freeform AI commands are unavailable there. Exact commands, the rule builder, recipes, challenges, saving and sharing all work.

## Screenshots

> **Screenshot placeholder.** No screenshots or gameplay GIF are committed yet. Before submission, capture real images from the running app (for example the chamber at rest, Break Reality mid-effect, a challenge ring, the Reality recipes panel) into a `docs/images/` folder and link them here. Only add images of the actual application.

## Break Reality

The fastest way to see what the app does. Press **Break Reality** in the top bar, or on the welcome card shown on a first visit.

- A fixed arrangement of **eight spheres and six cubes** appears around the reactor.
- One press adds a validated rule through the normal rule engine, and gravity in the Rapier world **really reverses for 2.5 seconds**. Objects rise, collide with the ceiling, and fall back when the engine restores gravity.
- The burst and sparks play only after the state change has succeeded, and the on-screen text follows the live gravity state.
- Afterwards choose **Replay**, **Explore Sandbox** or **Try Challenges**. Your own sandbox is stored while the experiment runs and restored when you leave.
- No login and no API key.

Status: implemented and covered by automated tests (including a headless Rapier test that the objects rise and fall). **Not yet verified in a real browser.**

## Features

### Interactive 3D physics sandbox
Orbit and zoom camera, a bounded chamber (floor grid, walls, ceiling, stars) and a decorative central reactor. The reactor is a static collider and **exerts no gravity**. Spawn spheres, cubes and heavy spheres (cap 60). Select by click or with `[` / `]`, then Throw, Push, Launch up, Spin or Nudge along ±X/±Z with real impulses. Failed actions are reported.

### Gravity and time manipulation
Gravity is normal, zero or reverse, with an adjustable magnitude, and a change wakes sleeping bodies. Freezing time stops the physics, the reactor and the star twinkle, and keeps every position. "Everything bouncy" raises restitution on all bodies, including ones spawned later.

### Deterministic commands (not AI)
Nine exact commands run locally and never call a model: `reverse gravity`, `zero gravity`, `normal gravity`, `freeze time`, `resume time`, `spawn sphere`, `spawn cube`, `make everything bouncy`, `reset universe` (plus a few aliases).

### Reality Recipes and rule builder
A rule is **WHEN** a trigger **THEN** an effect, with a cooldown and an optional duration.

| | Supported options |
|---|---|
| Triggers | collision (sphere or cube against sphere, cube or floor), or one-shot activation |
| Effects | spawn an object, apply an impulse, change gravity, change bounciness, visual burst |

Three recipes are included: **Chain Reaction** (two spheres collide, a sphere spawns), **Quantum Kick** (a sphere hits a cube and is launched upward), **Gravity Glitch** (a cube hits the floor, gravity reverses for 3 s). Recipes can be added, toggled and deleted independently, and the manual **rule builder** uses the same validator and engine. Safety limits: object cap, 12 rules, per-rule cooldowns, 6 effects per second, collision de-duplication, a spawn-generation limit, and clamped numbers. Frozen time discards collision events and pauses cooldowns.

### Reality Compiler (optional AI)
When the AI endpoint is enabled, a sentence that is not an exact command is sent to one model, which can only propose a rule in the strict schema above. The proposal is validated on the server and again in the browser, previewed, and added only after you press Activate. A language model never runs physics. **This is off by default, runs only on a host with the serverless endpoint and a key, and has never been tested against a live model.** On the Render demo it shows "(not configured)". See [AI configuration](#ai-configuration-optional).

### Three physics challenges
See [Reality Challenges](#reality-challenges).

### Force Lab
Select an object, then use **Shockwave**, **Implosion** or **Vortex Pulse** in the right panel. Each is a **one-time impulse** applied with Rapier's `applyImpulse` to dynamic bodies within 6 units of the selected object. The selected object itself is not pushed, and nothing is teleported or animated in place of physics.

| Action | What the impulse does |
|---|---|
| Shockwave | pushes nearby bodies directly away from the selected object, stronger the closer they are |
| Implosion | pulls nearby bodies toward it, fading near contact so they collide with it instead of overlapping |
| Vortex Pulse | pushes bodies sideways around the vertical axis through it, with a small upward lift |

The impulse is a fixed amount, so a heavy sphere (about 20 times the mass of a normal one) changes velocity far less, and walls, floor and gravity act on the result as usual. Velocity changes are capped at 15 m/s. These are not black holes, sustained fields or stable orbits: once the impulse is delivered, ordinary physics takes over. Force Lab is available only in ordinary Sandbox play with time running; it is disabled in challenges, Break Reality and shared-world sessions. It does not change saves, share links or rules. Status: covered by automated and headless Rapier tests, **not yet verified in a browser**.

### Reality DNA: shareable experiments
**Share experiment** (left panel) turns the current world into a link. The data lives in the URL fragment (`#w=...`), which is never sent to a server, so it works on any static host. Opening a link shows a preview (object counts, gravity, rules). **Play** loads it with its rules, **Replay** restarts it, **Remix** keeps it as your sandbox, and **Exit** restores yours. Limits: 30 objects, 6 rules, 4000 characters. Ids, velocities and tags are not shared. Imports pass through the save validator (allowlisted kinds and rules, clamped numbers) and nothing is evaluated. Malformed or oversized links show a clear error.

### Save and load
Three local slots in browser storage (objects, rotations, velocities, gravity, bounciness, rules), with a versioned, validated schema. Corrupt or oversized saves are rejected. Bodies are rebuilt on load and physics sleep state is not restored, so a loaded world is close to, not identical with, the saved one.

### Clap controls (optional)
Off by default. Permission is requested only when you press Enable. A short loud sound flips gravity between normal and reverse. It is a loudness heuristic, not clap recognition, so other noises can trigger it (sensitivity is adjustable). Audio is analysed in the browser and is never recorded or sent.

### Violet Meltdown visual design
A dark cosmic base with restrained accents: `#08060E`, `#240D42`, `#A259FF`, `#F5B5D2`, plus orange `#FF5A1F`, yellow `#FFD83D` and lime `#B7FF2A` for events. Effects are tied to real simulation events: the reactor flares in the colour of each reality change, sparks fire when a rule runs or a level starts or is solved, a ring follows the selected object, and a violet vignette shows while time is frozen. Reduced-motion preferences disable the animated effects.

## Reality Challenges

Open them from **Challenges** in the top bar. Entering a level stores your sandbox, exiting restores it, and Reset restarts the level. Spawning, rule editing and saving are disabled during a level. Success is always a real physics event, never a button, and a level completes only once.

| Challenge | Objective | How it is won |
|---|---|---|
| **Gravity Escape** | Get the glowing sphere into the energy ring above a shelf. | The sphere rolls under the shelf. Reverse gravity at the right moment (about 4.5 s in, once it is past the shelf edge) and it rises into the ring. Reversing too early traps it. Launch and Throw are disabled. The ring is a Rapier sensor that only counts the tagged sphere. |
| **Chain Reaction** | Make the Chain Reaction rule spawn 3 new spheres. | A lone sphere and a nine-sphere cluster. Select the lone sphere and nudge it into the cluster. Only spheres created by the rule count, and the rule cooldown and object cap apply. |
| **Quantum Launch** | Use Quantum Kick to launch the sphere into the ring. | Nudge the sphere into the heavy cube. The kick fires on impact and sends the sphere up to the ring. The ring only counts after the kick has fired. |

All three are checked for solvability, and for the failure cases (reversing too early, an untagged object entering the ring, no kick rule), in a headless Rapier harness. They have not been completed by hand in a browser yet.

## How Kiro Was Used

UNIVERSE.EXE was built with Kiro as a series of milestones, each driven by written specs and always-on steering rules. The commit history shows the work done by the Kiro agent.

- **Spec-driven development.** Each milestone has `requirements.md`, `design.md` and `tasks.md` under `.kiro/specs/`: `universe-exe` (sandbox), `reality-compiler` (rules and AI), `beautiful-chaos` (challenges, saves, effects), `launch-protocol` (release hardening) and `first-experience` (Break Reality and sharing). The specs fixed scope, recorded design decisions (rule schema, event system, safety limits, API boundary) and explicitly deferred later work. For example, blink-to-freeze is recorded as deferred rather than shipped half-done.
- **Steering.** `.kiro/steering/project.md` holds rules applied to every change: real 3D only (no 2D or CSS fakes), the colour palette, state in `src/store.ts`, per-frame work mutates refs, the interpreter is deterministic and never presented as AI, and no code execution.
- **Automated testing.** 154 Vitest tests, including headless Rapier tests that run the same physics engine without a browser.
- **Real problem 1: sleeping bodies ignore gravity changes.** Rapier puts resting bodies to sleep, and a sleeping body does not react to a new gravity vector. A headless test written from the spec (`sleeping bodies ignore gravity changes until woken`) demonstrates it. The app therefore wakes every body when gravity changes or time resumes, and the test guards that. Reverse gravity and Break Reality depend on it.
- **Real problem 2: a level that looked solvable was not reliably solvable.** With a 1.5 s rule cooldown, Chain Reaction passed only **12 of 16** seeded headless runs. The harness in `tests/rapierHarness.ts` replays each level's intended solution, so the cooldown was tuned to 0.8 s and the cluster tightened, giving **16 of 16**.

How this helped: specs kept each pass small and scoped, steering stopped drift toward fake effects, and tests turned physics assumptions into checks that run in seconds without opening a browser.

## Technology and Architecture

| Layer | Technology |
|---|---|
| UI | React 18, TypeScript, plain CSS, lucide-react icons |
| 3D rendering | Three.js 0.160, React Three Fiber 8, Drei 9 |
| Physics | Rapier 3D via `@react-three/rapier` 1.5 |
| Build | Vite 5 |
| Tests | Vitest 2 (logic and headless Rapier) |
| Optional AI endpoint | One serverless function (`api/compile.ts`), OpenAI Chat Completions with strict JSON schema |

The app is a single page. React state lives in one small external store, and per-frame work mutates refs instead of React state. The rule engine talks to the world through a `Host` interface, which is why it can be tested without WebGL.

```
src/store.ts             app state, actions, world replacement
src/commands.ts          the nine exact commands
src/physicsRegistry.ts   id -> live Rapier body, impulses
src/reality/             rule types, validator, engine, presets, AI client, live host
src/challenges/          level definitions, pure reducer, sessions
src/demo/                Break Reality world and session
src/physics/             Force Lab maths and apply/fire logic
src/world/               snapshot, saves, share links (save.ts, share.ts)
src/controls/            clap detector, microphone lifecycle
src/scene/               3D world: chamber, reactor, bodies, goal zones, sparks
src/ui/                  overlay panels, HUDs, command bar
api/compile.ts           optional AI endpoint
tests/                   Vitest suites and the headless Rapier harness
.kiro/                   specs and steering
docs/                    LAUNCH.md (checklists, demo script), USER_TESTING.md
```

## Verification Status

Automated checks: **154 tests passing** and a successful production build at the time of writing (rerun with `npm test` and `npm run build`).

Browser status is reported separately, because passing tests is not the same as working in a browser.

| Area | Automated tests | Browser status |
|---|---|---|
| Gravity and time controls | yes | **Verified** by the project owner in manual testing |
| Object spawning and selection | yes | **Verified** by the project owner |
| Manual Reality Recipes (rule builder, presets) | yes | **Verified** by the project owner |
| Exact local commands | yes | **Verified** by the project owner |
| Save and load | yes | **Verified** by the project owner |
| Sandbox / Challenges mode switching | yes | **Verified** by the project owner |
| Completing all three challenges | solvability in headless Rapier | **Not verified** |
| Break Reality first experience | yes, including headless lift test | **Not verified** |
| Force Lab (Shockwave, Implosion, Vortex Pulse) | yes, including headless Rapier tests | **Not verified** |
| Reality DNA share links | encode, decode, limits, bad input, Play and Remix | **Not verified** |
| Clap controls | detector and lifecycle only | **Not verified** (needs a real microphone) |
| AI Reality Compiler | mocked provider only | **Not verified** (never run against a real model) |
| Blink control | n/a | **Not implemented** (deferred) |

The "Verified" rows come from earlier manual testing reported by the project owner, not from the automated checks. The newest features have only been tested by the automated suite. Manual checklists: [`docs/LAUNCH.md`](docs/LAUNCH.md) (browser, responsive, deployment, demo script) and [`docs/USER_TESTING.md`](docs/USER_TESTING.md) (testing with five first-time users).

### Force Lab manual checks
1. Sandbox, spawn a few objects, click one to select it. The three Force Lab buttons enable.
2. **Shockwave**: neighbours within about 6 units fly away and bounce off walls; the feedback line says how many were pushed; an orange ring expands.
3. **Implosion**: neighbours move toward the selected object and collide with it instead of overlapping; a purple ring contracts.
4. **Vortex Pulse**: neighbours swirl around the selected object and lift slightly, then fall back; violet points orbit briefly.
5. Heavy sphere nearby barely moves compared with normal ones. With no objects in range the message says "nothing in range" and no effect plays.
6. Buttons are disabled with a reason while time is frozen, with nothing selected, in a challenge, in Break Reality and in a shared world; they work again back in the sandbox.
7. At 390 px wide the three buttons fit in one row without overlap.

## Installation and Deployment

Requires Node.js 20 or newer.

```bash
npm install
npm run dev      # Vite dev server, usually http://localhost:5173
npm test         # Vitest
npm run build    # typecheck + production build into dist/
```

### Render Static Site (the live demo)
Build command `npm install && npm run build`, publish directory `dist`, no rewrite rules (one page; share links use the URL fragment). Static sites have no `/api`, so the AI compiler stays at "(not configured)". Everything else works.

### Vercel (includes the optional AI endpoint)
Import the repository with the Vite preset (build `npm run build`, output `dist`). With no environment variables it deploys with AI off, exactly like Render. To enable AI add the variables below in the project settings. Step-by-step instructions and post-deploy checks are in [`docs/LAUNCH.md`](docs/LAUNCH.md).

### Other static hosts
Netlify, Cloudflare Pages and GitHub Pages serve the app without AI. For a GitHub Pages project site build with `npx vite build --base=/UNIVERSE.EXE-3D/`.

### AI configuration (optional)
The endpoint is off unless `AI_ENABLED` is exactly `true` and a key and model are set. Keys are server-side only and must never use a `VITE_` prefix.

| Variable | Purpose |
|---|---|
| `AI_ENABLED` | must be `true` to turn the endpoint on |
| `OPENAI_API_KEY` | provider key (server-side only) |
| `OPENAI_MODEL` | model name |
| `AI_RATE_PER_MINUTE`, `AI_DAILY_LIMIT` | optional best-effort limits (default 6 and 200) |

```bash
cp .env.example .env     # fill in the values, then
npm run dev
```
The built-in rate limits are in memory per server instance and are **not** a reliable abuse barrier. Before enabling AI on a public URL, set a hard spend limit at your provider and add a firewall rate-limit rule for `/api/compile`.

## Known Limitations

- **AI is not available on the live demo.** Render Static Site has no server endpoint, so freeform AI commands cannot work there. Elsewhere it has never been run against a real model; only mocked responses are tested.
- **Browser verification gaps.** The newest features (Break Reality, share links, full challenge completion, clap controls, live AI) have not been verified in a browser. Visuals, frame rate and mobile hardware performance are untested. See [Verification Status](#verification-status).
- **Blink-to-freeze is deferred.** It would need a new dependency and a model download.
- **Share links are limited.** 30 objects, 6 rules and 4000 characters, with no short links, and velocities are not shared. Links are long because the world is stored in the URL.
- **Loaded worlds are approximate.** Saves and shared worlds restore positions, rotations and velocities, but not physics sleep state or contact caches.
- **Clap detection is a loudness heuristic** and can be triggered by other loud sounds.
- **Rule language is small.** One effect per rule, no conditions, and only spheres and cubes.
- **Download size.** About 3 MB of JavaScript (about 1 MB gzipped), mostly Rapier's embedded WASM (about 2 MB). It is split into separate chunks so the interface paints first.
- **Challenge levels** are verified as solvable only in a headless physics replica of the scene.

## License

Released under the [MIT License](LICENSE). Copyright (c) 2026 Siripuram Nivas.

Third-party dependencies keep their own licenses (for example, Rapier is Apache-2.0). The repository bundles no images, fonts, audio or 3D models.
