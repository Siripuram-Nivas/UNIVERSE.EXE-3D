# Reality Compiler — Requirements (Milestone 2)

Builds on Milestone 1 (`.kiro/specs/universe-exe/`). Language becomes validated physics rules executed by the existing Rapier world.

1. **Rule engine** — Rules have id, name, trigger, effect, enabled flag, cooldown and optional duration.
2. **Triggers** — Collision (sphere/cube vs sphere/cube/floor) and activation (run once).
3. **Effects** — Spawn object, apply impulse, change gravity, change bounciness, visual burst. All use existing physics/state.
4. **Recipes** — Chain Reaction, Quantum Kick, Gravity Glitch. Each can be added, enabled, disabled and deleted independently.
5. **Safety** — Object cap, per-rule cooldown, global effects/second, collision de-duplication, spawn generation limit, clamped numbers, safe handling of removed bodies, frozen-time policy, reset clears everything.
6. **UI** — Collapsible "Reality recipes" section with presets, rule list, builder, clear-all. Builder, presets and AI proposals share one validation + activation path.
7. **AI compiler** — A server endpoint turns one sentence into a structured proposal. The proposal is re-validated in the browser, previewed, and only added after explicit confirmation. Exact deterministic commands never call the model.
8. **Honest fallback** — Without server credentials everything except AI compilation works, and the UI says AI is not configured.
9. **Security** — No keys in the browser, no code execution, input/output/time limits, rate limiting.

Out of scope: gestures, challenges, preset save/load, auth, databases (Milestone 3+).
