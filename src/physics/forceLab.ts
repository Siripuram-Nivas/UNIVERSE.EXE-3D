import { emitSparks, forceFxQueue } from '../effects'
import { bodies } from '../physicsRegistry'
import { getState, say, type Session } from '../store'
import { FORCE_LABEL, forceImpulse, type ForceKind, type Vec3 } from './force'

/** The slice of a Rapier rigid body that Force Lab uses (a real RapierRigidBody satisfies it). */
export interface ForceBody {
  translation(): { x: number; y: number; z: number }
  mass(): number
  wakeUp(): void
  applyImpulse(impulse: { x: number; y: number; z: number }, wake: boolean): void
  isDynamic?(): boolean
  isValid?(): boolean
}

export interface ForceResult {
  /** Bodies that received an impulse. */
  affected: number
  /** Dynamic bodies other than the centre that were examined. */
  considered: number
}

/** Applies a one-time impulse to every eligible body around `centerId`. Never moves a body directly; never touches the centre. */
export function applyForce(kind: ForceKind, centerId: number, registry: ReadonlyMap<number, ForceBody> = bodies): ForceResult | null {
  const c = registry.get(centerId)
  if (!c || c.isValid?.() === false) return null
  let center: Vec3
  try {
    const p = c.translation()
    center = [p.x, p.y, p.z]
  } catch {
    return null
  }
  let affected = 0
  let considered = 0
  for (const [id, b] of registry) {
    if (id === centerId) continue
    try {
      if (b.isValid?.() === false || b.isDynamic?.() === false) continue
      considered++
      const p = b.translation()
      const j = forceImpulse(kind, center, [p.x, p.y, p.z], b.mass())
      if (!j) continue
      b.wakeUp() // a sleeping body ignores impulses until woken
      b.applyImpulse({ x: j[0], y: j[1], z: j[2] }, true)
      affected++
    } catch {
      // a body freed mid-call is skipped, never fatal
    }
  }
  return { affected, considered }
}

/**
 * Why Force Lab is unavailable right now, or null if it can run. Pure: used for button states and re-checked on click.
 * Only ordinary Sandbox play qualifies.
 */
export function forceLabBlock(
  s: { challenge: unknown; session: Session | null; paused: boolean; selectedId: number | null },
  hasLiveBody: boolean,
): string | null {
  if (s.challenge) return 'Force Lab is off during challenges.'
  if (s.session) return 'Force Lab is off during guided experiences. Exit or remix first.'
  if (s.paused) return 'Time is frozen. Resume time to use Force Lab.'
  if (s.selectedId === null) return 'Select an object to use as the centre.'
  if (!hasLiveBody) return 'The selected object is not in the physics world.'
  return null
}

/** Button handler: checks availability, applies the force, reports honestly, and starts the visual only on success. */
export function fireForce(kind: ForceKind, registry: ReadonlyMap<number, ForceBody> = bodies): boolean {
  const s = getState()
  const id = s.selectedId
  const block = forceLabBlock(s, id !== null && registry.has(id))
  if (block || id === null) {
    say(block ?? 'Select an object first.', false)
    return false
  }
  const r = applyForce(kind, id, registry)
  const label = FORCE_LABEL[kind]
  if (!r) {
    say(`${label} failed: the selected object is not available.`, false)
    return false
  }
  if (r.affected === 0) {
    say(`${label}: nothing in range. Move objects within 6 units of #${id}.`, false)
    return false
  }
  const p = registry.get(id)!.translation()
  const pos: Vec3 = [p.x, p.y, p.z]
  forceFxQueue.push({ kind, pos })
  if (forceFxQueue.length > 4) forceFxQueue.shift()
  emitSparks(pos, kind === 'shockwave' ? 'orange' : kind === 'implosion' ? 'purple' : 'pink', 12)
  say(`${label} from #${id}: ${r.affected} ${r.affected === 1 ? 'object' : 'objects'} pushed.`)
  return true
}
