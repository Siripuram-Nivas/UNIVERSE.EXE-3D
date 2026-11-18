import RAPIER from '@dimforge/rapier3d-compat'
import { beforeAll, describe, expect, it } from 'vitest'
import { makeHost } from './helpers'

beforeAll(async () => { await RAPIER.init() })

/** Real Rapier collision events (same engine as the app) feeding the rule engine. */
describe('rapier collision events -> rule engine', () => {
  it('two falling spheres and a floor produce events that drive Chain Reaction and floor rules', () => {
    const w = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    const events = new RAPIER.EventQueue(true)
    const meta = new Map<number, { id: number | null; kind: 'sphere' | 'cube' | 'floor' }>()
    const floor = w.createCollider(RAPIER.ColliderDesc.cuboid(9, 0.5, 9).setTranslation(0, -0.5, 0).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS))
    meta.set(floor.handle, { id: null, kind: 'floor' })
    const mk = (id: number, x: number, y: number) => {
      const b = w.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, 0))
      const c = w.createCollider(RAPIER.ColliderDesc.ball(0.5).setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS), b)
      meta.set(c.handle, { id, kind: 'sphere' })
      return b
    }
    const b1 = mk(1, 0, 1.0)
    const b2 = mk(2, 0.2, 3.0) // lands on top of sphere 1

    const t = makeHost()
    t.body(1, 'sphere'); t.body(2, 'sphere')
    t.add(t.preset('chain-reaction'))
    t.add({ name: 'floor ping', trigger: { type: 'collision', a: 'sphere', b: 'floor' }, effect: { type: 'burst', color: 'lime' }, cooldownS: 0.5 })

    for (let i = 0; i < 180; i++) {
      w.step(events)
      events.drainCollisionEvents((h1, h2, started) => {
        if (!started) return
        const m1 = meta.get(h1)!; const m2 = meta.get(h2)!
        const [a, b] = m1.kind === 'floor' ? [m2, m1] : [m1, m2]
        const p = (a.id === 1 ? b1 : b2).translation()
        t.engine.enqueueCollision({ a: { id: a.id!, kind: 'sphere' }, b: { id: b.id, kind: b.kind }, pos: [p.x, p.y, p.z] })
      })
      t.engine.advance(1 / 60)
    }
    expect(t.s.spawned.length).toBeGreaterThanOrEqual(1)
    expect(t.s.spawned[0].kind).toBe('sphere')
    expect(t.s.bursts).toContain('lime')
  })
})
