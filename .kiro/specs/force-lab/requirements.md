# Force Lab — Requirements

Three one-time impulses around the selected object, available only in ordinary Sandbox play. They are not persistent fields and not Reality Compiler effects.

1. **Shockwave** — outward radial impulse on dynamic bodies within 6 units, linear falloff, selected object skipped.
2. **Implosion** — inward impulse with the same helper; fades near contact so bodies are never dragged into the centre; Rapier collisions decide the result.
3. **Vortex Pulse** — tangential impulse about the vertical axis through the selected object, plus a modest upward part. Bodies on the axis are skipped.
4. Real Rapier `applyImpulse` only (after `wakeUp`). No teleporting, no scripted orbits. Impulse is a fixed quantity, so heavy bodies change velocity less. Velocity change per body is capped at 15 m/s.
5. Degenerate input (zero distance, non-finite values, missing or freed bodies) is skipped safely. Feedback reports how many bodies were affected, or that nothing was in range.
6. Disabled during challenges, Break Reality, shared-world sessions, frozen time, with no selection, or when the selected body has no live physics body.
7. No change to saves, share links, rule schema, AI, challenges, gravity, object cap or existing push buttons.
8. Visuals (ring/shell/points pulse) start only after an impulse was applied; reduced motion disables them.
