# First Experience and Sharing — Design

- `store.session`: `{type:'break', phase}` or `{type:'shared', world}`. `replaceWorld` clears it by default; the sandbox is stashed once (`stash ?? captureWorld()`) and `exitChallenge` restores it for challenges and sessions alike.
- `demo/world.ts`: deterministic arrangement (fixed positions and rotations, no `Math.random`). `BREAK_RULE` is an activation rule with a gravity effect and a 2.5 s duration, added through `activateDraft`, so validation, caps and the engine clock all apply. If time is frozen it is resumed first.
- `breakReality()` only sets phase `broken` and fires sparks after `activateDraft` succeeded and gravity is actually reversed. The HUD text follows live `gravityMode`, so "Reality restored" appears only when the engine reverted it.
- `world/share.ts`: pure encode/decode. Payload `{v,g,m,b,o:[[kind,heavy,x,y,z,gen]],r:[rules]}` as base64url in `#w=`. Decode checks size, charset, JSON shape, version, counts, then reuses `validateSave` (clamping, rule validation). Fragment is removed after reading.
- UI: `WelcomeCard` (first visit), `SessionHud`, `SharedPreviewCard`, top-bar button, "Share experiment" in the save panel. Save and share are disabled inside a session.

## Deferred
Short links, compression, signed or expiring links, sharing velocities, previewing a shared world without loading it.
