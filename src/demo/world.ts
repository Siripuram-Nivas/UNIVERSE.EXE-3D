import { allocateId, type SimObject, type WorldState } from '../store'
import type { RuleDraft } from '../reality/types'

/** The one rule the first-experience button activates. Same schema, validator and engine as every other rule. */
export const BREAK_RULE: RuleDraft = {
  name: 'Reality Break',
  trigger: { type: 'activation' },
  effect: { type: 'gravity', mode: 'reverse' },
  cooldownS: 1,
  durationS: 2.5,
}

const Q: [number, number, number, number] = [0, 0, 0, 1]

/**
 * Deterministic arrangement (no Math.random): a ring of spheres and an outer ring of cubes around the reactor,
 * released from 0.15 m above the floor with fixed rotations. Ids are the only thing that differs between loads.
 */
export function breakRealityWorld(): WorldState {
  const objects: SimObject[] = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    objects.push({ id: allocateId(), kind: 'sphere', heavy: i % 4 === 0, gen: 0, quat: Q, pos: [round(Math.cos(a) * 3.5), 0.6, round(Math.sin(a) * 3.5)] })
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6
    objects.push({ id: allocateId(), kind: 'cube', heavy: false, gen: 0, quat: Q, pos: [round(Math.cos(a) * 5.6), 0.5, round(Math.sin(a) * 5.6)] })
  }
  return { objects, rules: [], gravityMode: 'normal', gravityMagnitude: 9.81, bouncy: false, paused: false }
}
const round = (n: number) => Math.round(n * 1000) / 1000
