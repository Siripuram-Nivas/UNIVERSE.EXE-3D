import RAPIER from '@dimforge/rapier3d-compat'
import { beforeAll, describe, expect, it } from 'vitest'

// Headless Rapier checks of the behaviours the app relies on (same engine, no renderer).
beforeAll(async () => { await RAPIER.init() })

function world(g: number) {
  const w = new RAPIER.World({ x: 0, y: g, z: 0 })
  w.createCollider(RAPIER.ColliderDesc.cuboid(9, 0.5, 9).setTranslation(0, -0.5, 0))
  w.createCollider(RAPIER.ColliderDesc.cuboid(9, 0.5, 9).setTranslation(0, 15.5, 0)) // ceiling
  return w
}
const ball = (w: RAPIER.World, y: number) => {
  const b = w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0, y, 0))
  w.createCollider(RAPIER.ColliderDesc.ball(0.5).setRestitution(0.3), b)
  return b
}
const run = (w: RAPIER.World, n: number) => { for (let i = 0; i < n; i++) w.step() }

describe('rapier world', () => {
  it('bodies fall and rest on the floor', () => {
    const w = world(-9.81); const b = ball(w, 6)
    run(w, 400)
    expect(b.translation().y).toBeGreaterThan(0.4)
    expect(b.translation().y).toBeLessThan(0.7)
  })
  it('sleeping bodies ignore gravity changes until woken, then rise', () => {
    const w = world(-9.81); const b = ball(w, 3)
    run(w, 600)
    expect(b.isSleeping()).toBe(true)
    w.gravity = { x: 0, y: 9.81, z: 0 }
    run(w, 30)
    expect(b.translation().y).toBeLessThan(0.7) // still stuck: this is why the app wakes bodies
    w.forEachRigidBody((x) => x.wakeUp())
    run(w, 120)
    expect(b.translation().y).toBeGreaterThan(2)
  })
  it('reverse gravity keeps bodies inside the ceiling', () => {
    const w = world(9.81); const b = ball(w, 5)
    run(w, 600)
    expect(b.translation().y).toBeLessThan(15)
    expect(b.translation().y).toBeGreaterThan(13)
  })
  it('restitution changes on existing colliders take effect', () => {
    const w = world(-9.81); const b = ball(w, 6)
    const c = b.collider(0)
    c.setRestitution(0.95)
    expect(c.restitution()).toBeCloseTo(0.95)
    run(w, 90) // hits floor around frame ~60
    let peak = 0
    for (let i = 0; i < 90; i++) { w.step(); if (b.linvel().y > 0) peak = Math.max(peak, b.translation().y) }
    expect(peak).toBeGreaterThan(1.5)
  })
})
