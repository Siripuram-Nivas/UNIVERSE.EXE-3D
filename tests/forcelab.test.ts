import RAPIER from '@dimforge/rapier3d-compat'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { enterChallenge, exitChallenge } from '../src/challenges/session'
import { enterBreak, enterShared } from '../src/demo/session'
import { forceFxQueue, sparkQueue } from '../src/effects'
import { FORCE, falloff, forceImpulse, type ForceKind, type Vec3 } from '../src/physics/force'
import { applyForce, fireForce, forceLabBlock, type ForceBody } from '../src/physics/forceLab'
import { addRule, getState, resetUniverse, select, setPaused, spawn } from '../src/store'
import { PRESETS } from '../src/reality/presets'
import { decodeShare, encodeShare } from '../src/world/share'

const C: Vec3 = [0, 0.5, 0]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len = (a: Vec3) => Math.hypot(...a)

/** Minimal fake body that records impulses. */
function fake(pos: Vec3, mass = 0.4, extra: Partial<ForceBody> = {}) {
  const hits: { x: number; y: number; z: number }[] = []
  let woke = 0
  const b: ForceBody & { hits: typeof hits; woke: () => number } = {
    translation: () => ({ x: pos[0], y: pos[1], z: pos[2] }),
    mass: () => mass,
    wakeUp: () => { woke++ },
    applyImpulse: (i) => { hits.push(i) },
    isDynamic: () => true,
    isValid: () => true,
    hits, woke: () => woke, ...extra,
  }
  return b
}

describe('force maths (pure)', () => {
  it('shockwave pushes outward along the line from the centre', () => {
    const j = forceImpulse('shockwave', C, [3, 0.5, 0], 0.4)!
    expect(j[0]).toBeGreaterThan(0); expect(j[1]).toBeCloseTo(0); expect(j[2]).toBeCloseTo(0)
    const j2 = forceImpulse('shockwave', C, [-1, 2.5, 1], 0.4)!
    expect(dot(j2, [-1, 2, 1])).toBeGreaterThan(0)
  })
  it('implosion pulls inward', () => {
    const j = forceImpulse('implosion', C, [3, 0.5, 0], 0.4)!
    expect(j[0]).toBeLessThan(0)
    const j2 = forceImpulse('implosion', C, [-1, 2.5, 1], 0.4)!
    expect(dot(j2, [-1, 2, 1])).toBeLessThan(0)
  })
  it('implosion fades out near contact so it cannot drag bodies into the centre', () => {
    const near = len(forceImpulse('implosion', C, [0.6, 0.5, 0], 0.4)!)
    const mid = len(forceImpulse('implosion', C, [1.5, 0.5, 0], 0.4)!)
    expect(near).toBeLessThan(mid)
  })
  it('vortex is tangential (no radial part in XZ), counter-clockwise about +Y, with a modest lift', () => {
    for (const p of [[2, 0.5, 0], [0, 0.5, 2], [-1.5, 0.5, 1.5], [1, 1.5, -3]] as Vec3[]) {
      const j = forceImpulse('vortex', C, p, 0.4)!
      const rx = p[0] - C[0]; const rz = p[2] - C[2]
      expect(Math.abs(j[0] * rx + j[2] * rz)).toBeLessThan(1e-9) // perpendicular to the radius
      expect(rz * j[0] - rx * j[2]).toBeGreaterThan(0)            // positive angular momentum about +Y
      expect(j[1]).toBeGreaterThan(0)
      expect(j[1]).toBeLessThan(Math.hypot(j[0], j[2]))            // lift is smaller than the swirl
    }
  })
  it('impulse falls off with distance and is zero at and beyond the radius', () => {
    for (const k of ['shockwave', 'implosion', 'vortex'] as ForceKind[]) {
      const a = len(forceImpulse(k, C, [2, 0.5, 0], 0.4)!)
      const b = len(forceImpulse(k, C, [4, 0.5, 0], 0.4)!)
      const c = len(forceImpulse(k, C, [5.9, 0.5, 0], 0.4)!)
      expect(a).toBeGreaterThan(b); expect(b).toBeGreaterThan(c)
      expect(forceImpulse(k, C, [FORCE.radius, 0.5, 0], 0.4)).toBeNull()
      expect(forceImpulse(k, C, [20, 0.5, 0], 0.4)).toBeNull()
    }
    expect(falloff(0)).toBe(1); expect(falloff(FORCE.radius)).toBe(0); expect(falloff(99)).toBe(0)
  })
  it('is safe at zero distance and other degenerate input', () => {
    for (const k of ['shockwave', 'implosion', 'vortex'] as ForceKind[]) {
      expect(forceImpulse(k, C, [...C], 0.4)).toBeNull()
      expect(forceImpulse(k, C, [0, 0.5, 1e-6], 0.4)).toBeNull()
      expect(forceImpulse(k, C, [NaN, 0, 0], 0.4)).toBeNull()
      expect(forceImpulse(k, [Infinity, 0, 0], [1, 0, 0], 0.4)).toBeNull()
      expect(forceImpulse(k, C, [2, 0.5, 0], 0)).toBeNull()
      expect(forceImpulse(k, C, [2, 0.5, 0], -1)).toBeNull()
      expect(forceImpulse(k, C, [2, 0.5, 0], NaN)).toBeNull()
    }
    expect(forceImpulse('vortex', C, [0, 3.5, 0], 0.4)).toBeNull() // directly above the axis: no tangent exists
  })
  it('heavier bodies get the same impulse but a smaller velocity change; speed change is bounded', () => {
    const light = forceImpulse('shockwave', C, [2, 0.5, 0], 0.38)!
    const heavy = forceImpulse('shockwave', C, [2, 0.5, 0], 8.6)!
    expect(heavy[0]).toBeCloseTo(light[0], 9)
    expect(len(heavy) / 8.6).toBeLessThan((len(light) / 0.38) * 0.1)
    const tiny = forceImpulse('shockwave', C, [0.2, 0.5, 0], 0.001)!
    expect(len(tiny) / 0.001).toBeLessThanOrEqual(FORCE.maxDeltaV + 1e-9)
  })
})

describe('applyForce on a registry', () => {
  it('never touches the selected centre object', () => {
    const centre = fake(C); const other = fake([2, 0.5, 0])
    const r = applyForce('shockwave', 1, new Map([[1, centre], [2, other]]))!
    expect(centre.hits).toHaveLength(0); expect(centre.woke()).toBe(0)
    expect(other.hits).toHaveLength(1); expect(other.woke()).toBe(1)
    expect(r).toEqual({ affected: 1, considered: 1 })
  })
  it('empty world and out-of-range bodies affect nothing', () => {
    expect(applyForce('shockwave', 1, new Map([[1, fake(C)]]))).toEqual({ affected: 0, considered: 0 })
    expect(applyForce('implosion', 1, new Map([[1, fake(C)], [2, fake([40, 0.5, 0])]]))).toEqual({ affected: 0, considered: 1 })
  })
  it('missing centre, invalid, static and broken bodies are skipped without throwing', () => {
    expect(applyForce('vortex', 99, new Map([[1, fake(C)]]))).toBeNull()
    expect(applyForce('vortex', 1, new Map([[1, fake(C, 0.4, { isValid: () => false })]]))).toBeNull()
    const ok = fake([2, 0.5, 0])
    const reg = new Map<number, ForceBody>([
      [1, fake(C)], [2, ok],
      [3, fake([2, 0.5, 1], 0.4, { isValid: () => false })],
      [4, fake([1, 0.5, 2], 0.4, { isDynamic: () => false })],
      [5, fake([1, 0.5, 1], 0.4, { translation: () => { throw new Error('freed') } })],
      [6, fake([NaN, 0, 0])],
      [7, fake([1, 0.5, -1], 0.4, { mass: () => 0 })],
    ])
    const r = applyForce('shockwave', 1, reg)!
    expect(r.affected).toBe(1)
    expect(ok.hits).toHaveLength(1)
  })
})

describe('availability rules', () => {
  const base = { challenge: null, session: null, paused: false, selectedId: 1 as number | null }
  it('only ordinary sandbox play with a live selected body is allowed', () => {
    expect(forceLabBlock(base, true)).toBeNull()
    expect(forceLabBlock({ ...base, challenge: { id: 'x' } }, true)).toMatch(/challenges/)
    expect(forceLabBlock({ ...base, session: { type: 'break', phase: 'ready' } }, true)).toMatch(/guided/)
    expect(forceLabBlock({ ...base, paused: true }, true)).toMatch(/frozen/)
    expect(forceLabBlock({ ...base, selectedId: null }, true)).toMatch(/Select/)
    expect(forceLabBlock(base, false)).toMatch(/not in the physics world/)
  })
})

describe('fireForce (store integration)', () => {
  beforeEach(() => { resetUniverse(); sparkQueue.length = 0; forceFxQueue.length = 0 })
  afterEach(() => { resetUniverse(); sparkQueue.length = 0; forceFxQueue.length = 0 })

  const sandbox = () => {
    const ids = getState().objects.map((o) => o.id)
    const reg = new Map<number, ReturnType<typeof fake>>()
    reg.set(ids[0], fake(C))
    ids.slice(1).forEach((id, i) => reg.set(id, fake([1.5 + i * 0.4, 0.5, 1])))
    select(ids[0])
    return { ids, reg }
  }

  it('fires: pushes neighbours, reports the count, starts visuals', () => {
    const { reg, ids } = sandbox()
    expect(fireForce('shockwave', reg)).toBe(true)
    expect(getState().feedback).toMatchObject({ ok: true })
    expect(getState().feedback.text).toContain(`${ids.length - 1} objects pushed`)
    expect(forceFxQueue).toHaveLength(1); expect(forceFxQueue[0].kind).toBe('shockwave')
    expect(sparkQueue.length).toBeGreaterThan(0)
    expect(reg.get(ids[0])!.hits).toHaveLength(0)
  })
  it('says so (and shows no effect) when nothing is in range', () => {
    const ids = getState().objects.map((o) => o.id)
    const reg = new Map([[ids[0], fake(C)], [ids[1], fake([30, 0.5, 0])]])
    select(ids[0])
    const burst = getState().burst.id
    expect(fireForce('implosion', reg)).toBe(false)
    expect(getState().feedback).toMatchObject({ ok: false }); expect(getState().feedback.text).toMatch(/nothing in range/)
    expect(forceFxQueue).toHaveLength(0); expect(sparkQueue).toHaveLength(0); expect(getState().burst.id).toBe(burst)
  })
  it('does nothing without a selection or with a missing body', () => {
    const { reg } = sandbox(); select(null)
    expect(fireForce('vortex', reg)).toBe(false)
    select(getState().objects[0].id); reg.delete(getState().objects[0].id)
    expect(fireForce('vortex', reg)).toBe(false)
    expect([...reg.values()].every((b) => b.hits.length === 0)).toBe(true)
  })
  it('is disabled while time is frozen', () => {
    const { reg } = sandbox(); setPaused(true)
    expect(fireForce('shockwave', reg)).toBe(false)
    expect([...reg.values()].every((b) => b.hits.length === 0)).toBe(true)
    setPaused(false)
    expect(fireForce('shockwave', reg)).toBe(true)
  })
  it('is disabled in all three challenges and returns after exit', () => {
    for (const id of ['gravity-escape', 'chain-reaction', 'quantum-launch']) {
      resetUniverse(); const sb = sandbox()
      enterChallenge(id)
      const ids = getState().objects.map((o) => o.id)
      const reg = new Map(ids.map((i, n) => [i, fake([n * 0.5, 0.5, 0])]))
      select(ids[0])
      expect(fireForce('shockwave', reg), id).toBe(false)
      expect([...reg.values()].every((b) => b.hits.length === 0)).toBe(true)
      exitChallenge()
      select(sb.ids[0])
      expect(fireForce('shockwave', sb.reg)).toBe(true)
    }
  })
  it('is disabled during Break Reality and shared-world sessions, until the user exits', () => {
    const { ids } = sandbox()
    enterBreak()
    const bids = getState().objects.map((o) => o.id)
    const breg = new Map(bids.map((i, n) => [i, fake([n * 0.5, 0.5, 0])]))
    select(bids[0])
    expect(fireForce('vortex', breg)).toBe(false)
    expect([...breg.values()].every((b) => b.hits.length === 0)).toBe(true)
    exitChallenge()
    expect(getState().objects.map((o) => o.id)).toEqual(ids)

    const enc = encodeShare({ objects: getState().objects, rules: [], gravityMode: 'normal', gravityMagnitude: 9.81, bouncy: false, paused: false })
    if (!enc.ok) throw new Error(enc.error)
    const dec = decodeShare(enc.token); if (!dec.ok) throw new Error(dec.error)
    enterShared(dec.world)
    const sids = getState().objects.map((o) => o.id)
    const sreg = new Map(sids.map((i, n) => [i, fake([n * 0.5, 0.5, 0])]))
    select(sids[0])
    expect(fireForce('shockwave', sreg)).toBe(false)
    expect([...sreg.values()].every((b) => b.hits.length === 0)).toBe(true)
  })
  it('does not change objects, rules, gravity, caps, saves or share data', () => {
    spawn('sphere'); addRule(PRESETS[0].draft, 'chain-reaction')
    const { reg } = sandbox()
    const before = getState()
    const shareBefore = encodeShare({ objects: before.objects, rules: before.rules, gravityMode: before.gravityMode, gravityMagnitude: before.gravityMagnitude, bouncy: before.bouncy, paused: false })
    fireForce('shockwave', reg); fireForce('implosion', reg); fireForce('vortex', reg)
    const after = getState()
    expect(after.objects).toBe(before.objects); expect(after.rules).toBe(before.rules)
    expect(after.gravityMode).toBe(before.gravityMode); expect(after.bouncy).toBe(before.bouncy)
    expect(after.epoch).toBe(before.epoch); expect(after.resetCount).toBe(before.resetCount)
    expect(encodeShare({ objects: after.objects, rules: after.rules, gravityMode: after.gravityMode, gravityMagnitude: after.gravityMagnitude, bouncy: after.bouncy, paused: false })).toEqual(shareBefore)
  })
  it('world reset and replacement clear pending force visuals', () => {
    forceFxQueue.push({ kind: 'shockwave', pos: [0, 1, 0] }); resetUniverse()
    expect(forceFxQueue).toHaveLength(0)
    forceFxQueue.push({ kind: 'vortex', pos: [0, 1, 0] }); enterChallenge('gravity-escape')
    expect(forceFxQueue).toHaveLength(0)
  })
})

/* ---------------- headless Rapier: the real engine ---------------- */
describe('headless Rapier confirms real physical effects', () => {
  beforeAll(async () => { await RAPIER.init() })

  type P = { pos: Vec3; heavy?: boolean }
  function labWorld(ps: P[]) {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    const ground = (hx: number, hy: number, hz: number, x: number, y: number, z: number) =>
      world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setFriction(0.8).setRestitution(0.3))
    ground(9, 0.5, 9, 0, -0.5, 0)               // floor
    ground(0.5, 7, 9, 8.5, 7, 0); ground(0.5, 7, 9, -8.5, 7, 0) // side walls (inner faces at x = ±8)
    ground(9, 7, 0.5, 0, 7, 8.5); ground(9, 7, 0.5, 0, 7, -8.5)
    const reg = new Map<number, RAPIER.RigidBody>()
    ps.forEach((p, i) => {
      const b = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(...p.pos).setLinearDamping(0.05).setAngularDamping(0.2).setCcdEnabled(true))
      world.createCollider(RAPIER.ColliderDesc.ball(p.heavy ? 0.7 : 0.45).setDensity(p.heavy ? 6 : 1).setRestitution(0.3).setFriction(0.6), b)
      reg.set(i + 1, b)
    })
    const step = (n: number) => { for (let i = 0; i < n; i++) world.step() }
    const pos = (id: number) => { const t = reg.get(id)!.translation(); return [t.x, t.y, t.z] as Vec3 }
    const vel = (id: number) => { const v = reg.get(id)!.linvel(); return [v.x, v.y, v.z] as Vec3 }
    return { world, reg, step, pos, vel }
  }
  const ring = (r: number, n = 4, y = 0.45): P[] => Array.from({ length: n }, (_, i) => ({ pos: [Math.cos((i / n) * 6.2832) * r, y, Math.sin((i / n) * 6.2832) * r] as Vec3 }))
  const centre: P = { pos: [0, 0.45, 0] }
  const radial = (v: Vec3, p: Vec3) => { const d = Math.hypot(p[0], p[2]) || 1; return (v[0] * p[0] + v[2] * p[2]) / d }

  it('shockwave: neighbours get outward velocity and end up farther away; the centre is untouched', () => {
    const w = labWorld([centre, ...ring(2)]); w.step(60)
    const before = [2, 3, 4, 5].map((i) => Math.hypot(...w.pos(i)))
    expect(applyForce('shockwave', 1, w.reg)!.affected).toBe(4)
    w.step(2)
    for (const i of [2, 3, 4, 5]) expect(radial(w.vel(i), w.pos(i))).toBeGreaterThan(2)
    expect(Math.hypot(...w.vel(1))).toBeLessThan(0.5) // centre did not get an impulse
    w.step(40)
    ;[2, 3, 4, 5].forEach((id, k) => expect(Math.hypot(w.pos(id)[0], w.pos(id)[2])).toBeGreaterThan(before[k] + 0.8))
  })
  it('implosion: neighbours move toward the centre and never overlap it', () => {
    const w = labWorld([centre, ...ring(3.5)]); w.step(60)
    expect(applyForce('implosion', 1, w.reg)!.affected).toBe(4)
    w.step(2)
    for (const i of [2, 3, 4, 5]) expect(radial(w.vel(i), w.pos(i))).toBeLessThan(-1)
    let minD = 99
    for (let s = 0; s < 120; s++) {
      w.step(1)
      const c = w.pos(1)
      for (const i of [2, 3, 4, 5]) { const p = w.pos(i); minD = Math.min(minD, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2])) }
    }
    expect(minD).toBeGreaterThan(0.8) // two radii are 0.9: collisions keep the bodies apart
  })
  it('vortex: neighbours swirl counter-clockwise about +Y and rise a little', () => {
    const w = labWorld([centre, ...ring(2, 4, 0.5)]); w.step(60)
    expect(applyForce('vortex', 1, w.reg)!.affected).toBe(4)
    w.step(6)
    for (const i of [2, 3, 4, 5]) {
      const p = w.pos(i); const v = w.vel(i)
      expect(p[2] * v[0] - p[0] * v[2]).toBeGreaterThan(0.5)
      expect(Math.abs(radial(v, p))).toBeLessThan(Math.hypot(v[0], v[2]) * 0.6) // mostly tangential
      expect(p[1]).toBeGreaterThan(0.46)
    }
  })
  it('falloff is physical: a nearer body moves faster than a farther one', () => {
    const w = labWorld([centre, { pos: [1.5, 0.45, 0] }, { pos: [-4.5, 0.45, 0] }]); w.step(60)
    applyForce('shockwave', 1, w.reg); w.step(1)
    expect(Math.hypot(...w.vel(2))).toBeGreaterThan(Math.hypot(...w.vel(3)) * 2)
  })
  it('a heavy body responds far less than a normal one at the same distance', () => {
    const w = labWorld([centre, { pos: [2.5, 0.45, 0] }, { pos: [-2.5, 0.7, 0], heavy: true }]); w.step(60)
    const mNormal = w.reg.get(2)!.mass(); const mHeavy = w.reg.get(3)!.mass()
    expect(mHeavy).toBeGreaterThan(mNormal * 10)
    applyForce('shockwave', 1, w.reg); w.step(1)
    const vN = Math.hypot(...w.vel(2)); const vH = Math.hypot(...w.vel(3))
    expect(vH).toBeGreaterThan(0.01) // it does respond
    expect(vH).toBeLessThan(vN * 0.15)
  })
  it('sleeping bodies are woken and moved; the trajectory differs from an untouched control', () => {
    const w = labWorld([centre, ...ring(2)]); const control = labWorld([centre, ...ring(2)])
    w.step(400); control.step(400)
    expect(w.reg.get(2)!.isSleeping()).toBe(true)
    applyForce('shockwave', 1, w.reg)
    w.step(30); control.step(30)
    expect(w.reg.get(2)!.isSleeping()).toBe(false)
    const a = w.pos(2); const b = control.pos(2)
    expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeGreaterThan(1)
  })
  it('walls still contain pushed bodies (a strong push near a wall does not escape the chamber)', () => {
    const w = labWorld([{ pos: [4, 0.45, 0] }, { pos: [6.5, 0.45, 0] }, { pos: [6.5, 0.45, 1.2] }]); w.step(60)
    applyForce('shockwave', 1, w.reg)
    w.step(240)
    for (const i of [2, 3]) { const p = w.pos(i); expect(Math.abs(p[0])).toBeLessThan(8); expect(p[1]).toBeGreaterThan(0.3) }
  })
  it('gravity is respected: a vortex lift falls back down', () => {
    const w = labWorld([centre, ...ring(1.5, 3, 0.5)]); w.step(60)
    applyForce('vortex', 1, w.reg); w.step(200)
    for (const i of [2, 3, 4]) expect(w.pos(i)[1]).toBeLessThan(0.6)
  })
})
