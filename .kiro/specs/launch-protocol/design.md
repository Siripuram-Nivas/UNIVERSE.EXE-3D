# Launch Protocol — Design

## Findings and changes
- **Bundle (measured with a source map):** about 3.1 MB, of which `@dimforge/rapier3d-compat` 2.0 MB (WASM embedded as base64), `three` 649 KB, React and reconciler about 220 KB, app code 63 KB, drei 7 KB. App code and drei are not the problem. Changes: `React.lazy` for the Scene and `manualChunks` for `rapier` and `three`. Entry chunk 3.1 MB to 214 KB; total payload unchanged. Runtime frame cost is unmeasured.
- **Goal events** now carry the object id; `challengeEvent` ignores ids not present in `objects`. `replaceWorld` clears `sparkQueue`. The reducer is unchanged.
- **API** (`api/compile.ts`): `AI_ENABLED` gate, `Origin` vs `Host` check, `content-length` pre-check, Vercel IP headers preferred. Relative imports on the API import chain use `.js` suffixes (Node ESM). Unchanged: input and output limits, timeout, strict schema, validation server and client.
- **CSS**: top bar compaction under 720 px, HUD placement under 1280 px, `.has-hud` panel offset, coarse-pointer sizes.

## Not changed (reviewed, acceptable)
Collision wiring (`userData` on the RigidBody object reaches `other.rigidBodyObject`, confirmed in the library source), registry cleanup through ref callbacks, engine reset on `resetCount`, no shadow maps, DPR cap 1.75, 96-point spark pool, object cap 60.

## Known unknowns
Vercel's handling of the `.js` suffixes, real frame rate, Rapier event delivery in the live scene, microphone behaviour, and anything visual. All require a browser or a deployment.
