import { bodies } from '../physicsRegistry'
import { getState, type SimObject, type WorldState } from '../store'

const r = (n: number) => Math.round(n * 1000) / 1000

/** Reads the live Rapier bodies (position, rotation, velocities) into a plain, serialisable WorldState. */
export function captureWorld(): WorldState {
  const s = getState()
  const objects: SimObject[] = s.objects.map((o) => {
    const b = bodies.get(o.id)
    if (!b) return { ...o }
    const p = b.translation(); const q = b.rotation(); const v = b.linvel(); const a = b.angvel()
    return {
      id: o.id, kind: o.kind, heavy: o.heavy, gen: o.gen ?? 0, ...(o.tag ? { tag: o.tag } : {}),
      pos: [r(p.x), r(p.y), r(p.z)],
      quat: [r(q.x), r(q.y), r(q.z), r(q.w)],
      vel: [r(v.x), r(v.y), r(v.z)],
      angvel: [r(a.x), r(a.y), r(a.z)],
    }
  })
  return {
    objects,
    rules: s.rules.map((x) => ({ ...x })),
    gravityMode: s.gravityMode,
    gravityMagnitude: s.gravityMagnitude,
    bouncy: s.bouncy,
    paused: s.paused,
  }
}
