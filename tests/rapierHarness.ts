import RAPIER from '@dimforge/rapier3d-compat'
import type { ChallengeDef } from '../src/challenges/defs'
import { initialChallengeState, reduceChallenge, type ChallengeEvent, type ChallengeState } from '../src/challenges/state'
import { RealityEngine, type BodyInfo, type Host } from '../src/reality/engine'
import { PRESETS } from '../src/reality/presets'
import type { ObjKind, RGravityMode, Rule } from '../src/reality/types'

type Meta = { id: number | null; kind: ObjKind | 'floor' | 'static' | 'goal'; tag?: string; gen: number }
const G = { normal: -9.81, zero: 0, reverse: 9.81 }

/** Headless replica of the app's physics (same engine, same materials) driving the challenge reducer. */
export async function buildChallengeWorld(def: ChallengeDef) {
  await RAPIER.init()
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  const events = new RAPIER.EventQueue(true)
  const ACTIVE = RAPIER.ActiveEvents.COLLISION_EVENTS
  const metaByCollider = new Map<number, Meta>()
  const bodyById = new Map<number, RAPIER.RigidBody>()
  const meta = new Map<number, Meta>()
  let gravity: RGravityMode = 'normal'
  let nextId = 1
  let state: ChallengeState = initialChallengeState(def)
  const log: string[] = []

  const stat = (hx: number, hy: number, hz: number, x: number, y: number, z: number, m: Meta, fr = 0.6) => {
    const c = world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setRestitution(0.3).setFriction(fr).setActiveEvents(ACTIVE))
    metaByCollider.set(c.handle, m)
  }
  stat(8.5, 0.5, 8.5, 0, -0.5, 0, { id: null, kind: 'floor', gen: 0 }, 0.8)
  stat(0.5, 7.5, 8.5, 8.5, 7.5, 0, { id: null, kind: 'static', gen: 0 })
  stat(0.5, 7.5, 8.5, -8.5, 7.5, 0, { id: null, kind: 'static', gen: 0 })
  stat(8.5, 7.5, 0.5, 0, 7.5, 8.5, { id: null, kind: 'static', gen: 0 })
  stat(8.5, 7.5, 0.5, 0, 7.5, -8.5, { id: null, kind: 'static', gen: 0 })
  stat(8.5, 0.5, 8.5, 0, 15.5, 0, { id: null, kind: 'static', gen: 0 })
  for (const b of def.blocks) stat(b.size[0] / 2, b.size[1] / 2, b.size[2] / 2, ...b.pos, { id: null, kind: 'static', gen: 0 })
  if (def.goal) {
    const c = world.createCollider(RAPIER.ColliderDesc.ball(def.goal.radius).setTranslation(...def.goal.pos).setSensor(true).setActiveEvents(ACTIVE))
    metaByCollider.set(c.handle, { id: null, kind: 'goal', gen: 0 })
  }

  const addBody = (kind: ObjKind, heavy: boolean, pos: [number, number, number], vel: [number, number, number] | undefined, tag: string | undefined, gen: number) => {
    const id = nextId++
    const b = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(...pos).setLinearDamping(0.05).setAngularDamping(0.2).setCcdEnabled(true))
    if (vel) b.setLinvel({ x: vel[0], y: vel[1], z: vel[2] }, true)
    const size = kind === 'sphere' ? (heavy ? 0.7 : 0.45) : heavy ? 0.9 : 0.7
    const desc = kind === 'sphere' ? RAPIER.ColliderDesc.ball(size) : RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2)
    const c = world.createCollider(desc.setDensity(heavy ? 6 : 1).setRestitution(0.3).setFriction(0.6).setActiveEvents(ACTIVE), b)
    const m: Meta = { id, kind, tag, gen }
    metaByCollider.set(c.handle, m); meta.set(id, m); bodyById.set(id, b)
    return id
  }
  for (const o of def.objects) addBody(o.kind, !!o.heavy, o.pos, o.vel, o.tag, 0)

  const rules: Rule[] = def.presets.map((pid, i) => ({ ...PRESETS.find((p) => p.presetId === pid)!.draft, id: `r${i}`, enabled: true, presetId: pid }))
  const emit = (ev: ChallengeEvent) => { state = reduceChallenge(state, def, ev) }
  const host: Host = {
    rules: () => rules,
    paused: () => false,
    getBody(id): BodyInfo | null {
      const b = bodyById.get(id); const m = meta.get(id)
      if (!b || !m || m.kind === 'floor' || m.kind === 'static' || m.kind === 'goal') return null
      const p = b.translation()
      return { kind: m.kind, pos: [p.x, p.y, p.z], gen: m.gen }
    },
    spawn(kind, pos, gen) {
      if (bodyById.size >= 60) return null
      const id = addBody(kind, false, pos, undefined, undefined, gen)
      emit({ type: 'spawn' })
      return id
    },
    impulse(id, v) {
      const b = bodyById.get(id); if (!b) return false
      const m = b.mass(); b.wakeUp(); b.applyImpulse({ x: v[0] * m, y: v[1] * m, z: v[2] * m }, true); return true
    },
    allIds: () => [...bodyById.keys()],
    getGravity: () => gravity,
    setGravity: (m) => { gravity = m; world.gravity = { x: 0, y: G[m], z: 0 }; world.forEachRigidBody((b) => b.wakeUp()) },
    getBouncy: () => false,
    setBouncy: () => {},
    burst: () => {},
    log: (t) => { log.push(t) },
    fired: () => emit({ type: 'fired' }),
  }
  const engine = new RealityEngine(host)

  const step = () => {
    world.step(events)
    events.drainCollisionEvents((h1, h2, started) => {
      if (!started) return
      const a = metaByCollider.get(h1); const b = metaByCollider.get(h2)
      if (!a || !b) return
      if (a.kind === 'goal' || b.kind === 'goal') {
        const o = a.kind === 'goal' ? b : a
        if (o.id !== null) emit({ type: 'goal', tag: o.tag })
        return
      }
      const [x, y] = a.kind === 'floor' || a.kind === 'static' ? [b, a] : [a, b]
      if (x.id === null || x.kind === 'floor' || x.kind === 'static' || x.kind === 'goal') return
      if (y.kind === 'static') return
      const p = bodyById.get(x.id)!.translation()
      const q = y.id !== null ? bodyById.get(y.id)!.translation() : p
      engine.enqueueCollision({ a: { id: x.id, kind: x.kind }, b: { id: y.id, kind: y.kind as 'sphere' | 'cube' | 'floor' }, pos: [(p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2] })
    })
    engine.advance(1 / 60)
  }
  return {
    step,
    run(seconds: number) { for (let i = 0; i < seconds * 60; i++) step() },
    setGravity: host.setGravity,
    nudge(id: number, v: [number, number, number]) { host.impulse(id, v) },
    pos: (id: number) => { const p = bodyById.get(id)!.translation(); return [p.x, p.y, p.z] as const },
    idByTag: (tag: string) => [...meta.values()].find((m) => m.tag === tag)!.id!,
    get state() { return state },
    get bodyCount() { return bodyById.size },
    log,
  }
}
