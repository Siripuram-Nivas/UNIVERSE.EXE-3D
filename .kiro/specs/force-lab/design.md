# Force Lab — Design

- `src/physics/force.ts`: pure `forceImpulse(kind, centre, pos, mass)` and constants (`radius 6`, `refMass 0.4`, peak velocity changes 12 / 9 / 8 m/s, vortex lift 2 m/s, contact 1.5, cap 15 m/s). No Rapier, no React.
- `src/physics/forceLab.ts`: `applyForce` (loops the body registry, try/catch per body), `forceLabBlock` (pure availability rules, used for button state and re-checked on click), `fireForce` (store feedback, sparks, visual queue). The registry is injectable for tests.
- `src/effects.ts`: `forceFxQueue`, cleared by `replaceWorld` and `resetUniverse`.
- `src/scene/ForceFX.tsx`: one group (ring, shell, 14 points), ref-mutation only, one pulse at a time.
- `src/ui/RightPanel.tsx`: compact "Force Lab" row inside the selected-object block; reason text shown when disabled.
- Vortex direction is (0,1,0) x r, i.e. counter-clockwise about +Y by the right-hand rule.

Not touched: `physicsRegistry.ts` push buttons, `PhysicsController`, `SimObjectBody`, save schema, share format, rules.
