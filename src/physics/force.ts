/**
 * Force Lab maths: pure functions, no Rapier and no React.
 * Each action is a ONE-TIME impulse (not a persistent field). The impulse is a fixed physical quantity
 * (REF_MASS * a reference velocity change), so a heavy body, having more mass, changes velocity less than a light one.
 */
export type Vec3 = [number, number, number]
export type ForceKind = 'shockwave' | 'implosion' | 'vortex'

export const FORCE = {
  /** Bodies farther than this (world units, 3D distance from the selected object's centre) are untouched. */
  radius: 6,
  /** Reference mass of a normal object (about 0.35 to 0.4). Impulse = reference velocity change * this. */
  refMass: 0.4,
  /** Peak velocity change (m/s) a reference-mass body would get at distance ~0. Linear falloff to 0 at `radius`. */
  shockwave: 12,
  implosion: 9,
  vortex: 8,
  /** Extra upward velocity change for the vortex (m/s, same falloff). */
  vortexLift: 2,
  /** Implosion pull fades to zero inside this distance so bodies are never dragged into the centre object. */
  contact: 1.5,
  /** Below this distance the direction is undefined, so the body is skipped. */
  epsilon: 1e-3,
  /** No body ever receives a velocity change above this (m/s). */
  maxDeltaV: 15,
} as const

export const FORCE_LABEL: Record<ForceKind, string> = { shockwave: 'Shockwave', implosion: 'Implosion', vortex: 'Vortex Pulse' }

const finite3 = (v: Vec3) => v.every((n) => Number.isFinite(n))

/** Linear falloff: 1 at the centre, 0 at the radius. */
export const falloff = (distance: number) => Math.max(0, 1 - distance / FORCE.radius)

/**
 * Impulse to apply to one body, or null if it must be skipped (out of range, coincident with the centre,
 * non-finite input, non-positive mass).
 * - shockwave: along (body - centre), outward.
 * - implosion: along (centre - body), inward, fading near contact.
 * - vortex: tangent around the vertical axis through the centre (counter-clockwise seen from above, right-hand rule about +Y),
 *   plus a modest upward part. Skipped when the body is on the axis, where no tangent exists.
 */
export function forceImpulse(kind: ForceKind, center: Vec3, pos: Vec3, mass: number): Vec3 | null {
  if (!finite3(center) || !finite3(pos) || !Number.isFinite(mass) || mass <= 0) return null
  const dx = pos[0] - center[0]
  const dy = pos[1] - center[1]
  const dz = pos[2] - center[2]
  const d = Math.hypot(dx, dy, dz)
  if (d < FORCE.epsilon || d >= FORCE.radius) return null
  const f = falloff(d)

  let dv: Vec3
  if (kind === 'shockwave') {
    const s = (FORCE.shockwave * f) / d
    dv = [dx * s, dy * s, dz * s]
  } else if (kind === 'implosion') {
    const g = (FORCE.implosion * f * Math.min(1, d / FORCE.contact)) / d
    dv = [-dx * g, -dy * g, -dz * g]
  } else {
    const dxz = Math.hypot(dx, dz)
    if (dxz < FORCE.epsilon) return null
    const t = (FORCE.vortex * f) / dxz
    dv = [dz * t, FORCE.vortexLift * f, -dx * t] // (0,1,0) x (dx,0,dz) = (dz,0,-dx)
  }

  let j: Vec3 = [dv[0] * FORCE.refMass, dv[1] * FORCE.refMass, dv[2] * FORCE.refMass]
  const change = Math.hypot(...j) / mass
  if (change > FORCE.maxDeltaV) {
    const k = FORCE.maxDeltaV / change
    j = [j[0] * k, j[1] * k, j[2] * k]
  }
  return finite3(j) ? j : null
}
