# Reality Compiler — Design

## Rule schema (`src/reality/types.ts`)
`Rule = { id, name, trigger, effect, enabled, cooldownS (0.5-60), durationS? (0.5-30), presetId? }`
- `Trigger = collision{a: sphere|cube, b: sphere|cube|floor} | activation`
- `Effect = spawn{kind, at: collision|above_center} | impulse{target a|b|both, direction up|down|away, strength 0.5-30 m/s} | gravity{mode} | bounciness{bouncy} | burst{color}`
- `a` is the first object named in the trigger; collision events are matched in either order.
- Duration only applies to gravity/bounciness and reverts the previous value (engine clock, so frozen time freezes it).

## Pipeline
sentence -> exact command match (`commands.ts`, no model) -> otherwise `POST /api/compile` -> server maps the model's flat strict-JSON output (`aiSchema.ts`) and validates (`validator.ts`) -> browser `parseCompileResponse` validates again -> preview card -> Activate -> `activateDraft` -> `store.addRule`. Builder and presets call `activateDraft` directly. The model is never called to execute a rule.

## Event system (`engine.ts`, `liveHost.ts`)
`SimObjectBody` `onCollisionEnter` -> `engine.enqueueCollision` (returns early when no collision rules exist) -> bounded queue -> `RealityRunner` (`useFrame`) calls `engine.advance(dt)` -> match, cooldown, rate limit, effect via `Host`. The engine only talks to a `Host` interface, so it is tested without React or WebGL. The floor and objects are identified through `userData` on their RigidBody.

## Safety limits (`LIMITS`)
60 objects (M1 cap), 12 rules, 6 effects/s, queue 64, 16 events/tick, 150 ms pair de-dupe, spawn generation limit 3, positions clamped inside the chamber, impulses via `applyImpulse` after `wakeUp`.
Frozen-time policy: events during a freeze are discarded; cooldowns, durations and the engine clock do not advance. `resetUniverse` clears rules and bumps `resetCount`, which makes the engine drop its queue, cooldowns and revert timers.

## API boundary (`api/compile.ts`)
Web-standard `GET`/`POST` handlers (Vercel Functions). One provider (OpenAI Chat Completions, strict `json_schema`). Env: `OPENAI_API_KEY`, `OPENAI_MODEL`, optional `AI_RATE_PER_MINUTE`, `AI_DAILY_LIMIT`. 200-char input, 2 KB body, 8 KB model output, 15 s timeout, 400 output tokens, in-memory per-IP and daily limits. The Vite dev server serves the same handler locally via a dev-only plugin.

## Testing
Vitest: validator, engine with a fake host, store rules, mocked AI endpoint and client, and a headless Rapier collision-event integration test.

## Dependencies on Milestone 1
`store.ts` (state, `spawnAt`), `physicsRegistry.ts` (bodies), `commands.ts` (deterministic first), `BurstFX`, `SimObjectBody`, `Chamber` (floor tagging).
