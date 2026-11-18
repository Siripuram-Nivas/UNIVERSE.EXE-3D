# UNIVERSE.EXE — Design (Milestone 1)

**Stack:** React 18 + TypeScript + Vite 5, three 0.160, @react-three/fiber 8, @react-three/drei 9, @react-three/rapier 1.5, lucide-react, plain CSS.

## Architecture
- `src/store.ts` — tiny external store (`useSyncExternalStore`): gravity, pause, bounciness, quality, object list, selection, feedback, burst events. Single source of truth for UI and scene.
- `src/commands.ts` — deterministic command table (name + aliases -> store actions). Exact-phrase match after normalisation.
- `src/physicsRegistry.ts` — id -> Rapier body map and camera-forward vector, so impulses and live readouts bypass React per-frame updates.
- `src/scene/` — `Scene` (Canvas, lights, stars, OrbitControls, `<Physics gravity paused>`), `Chamber` (fixed colliders + visuals), `Reactor` (decorative static collider), `SimObjectBody` (dynamic bodies), `PhysicsController` (wakes bodies on gravity/resume, syncs restitution, rescues escapees), `BurstFX` (shockwave + light flash via refs).
- `src/ui/` — `TopBar`, `LeftPanel`, `RightPanel`, `CommandBar`; HTML overlays over the canvas.

## Key decisions
- Gravity via Physics `gravity` prop; bodies are explicitly woken since sleeping Rapier bodies ignore gravity changes.
- Pause uses Physics `paused`, so positions persist.
- Restitution is applied to every collider with identical values, so the combine rule is irrelevant.
- Object cap 60; DPR capped at 1.75; optional low-quality toggle (DPR 0.75); no post-processing.
