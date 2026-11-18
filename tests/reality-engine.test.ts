import { describe, expect, it } from 'vitest'
import { LIMITS } from '../src/reality/types'
import { makeHost } from './helpers'

const hit = (a: [number, 'sphere' | 'cube'], b: [number, 'sphere' | 'cube'] | 'floor', pos: [number, number, number] = [1, 1, 1]) => ({
  a: { id: a[0], kind: a[1] },
  b: b === 'floor' ? { id: null, kind: 'floor' as const } : { id: b[0], kind: b[1] },
  pos,
})

describe('collision matching and effects', () => {
  it('Chain Reaction: sphere+sphere spawns a sphere near the impact', () => {
    const t = makeHost(); t.body(1, 'sphere'); t.body(2, 'sphere'); t.add(t.preset('chain-reaction'))
    expect(t.engine.enqueueCollision(hit([1, 'sphere'], [2, 'sphere'], [2, 1, -3]))).toBe(true)
    t.step(0.1)
    expect(t.s.spawned).toHaveLength(1)
    expect(t.s.spawned[0].kind).toBe('sphere')
    expect(Math.abs(t.s.spawned[0].pos[0] - 2)).toBeLessThan(1)
    expect(t.s.spawned[0].gen).toBe(1)
    expect(t.s.bursts).toContain('yellow')
  })
  it('does not fire for non-matching pairs', () => {
    const t = makeHost(); t.body(1, 'sphere'); t.body(2, 'cube'); t.add(t.preset('chain-reaction'))
    t.engine.enqueueCollision(hit([1, 'sphere'], [2, 'cube'])); t.step(0.1)
    expect(t.s.spawned).toHaveLength(0)
  })
  it('Quantum Kick: pushes the SPHERE upward regardless of event order', () => {
    const t = makeHost(); t.body(1, 'cube'); t.body(2, 'sphere'); t.add(t.preset('quantum-kick'))
    t.engine.enqueueCollision(hit([1, 'cube'], [2, 'sphere'])); t.step(0.1)
    expect(t.s.impulses).toHaveLength(1)
    expect(t.s.impulses[0].id).toBe(2)
    expect(t.s.impulses[0].v[1]).toBeGreaterThan(0)
  })
  it('Gravity Glitch: cube on floor reverses gravity, then reverts after its duration', () => {
    const t = makeHost(); t.body(1, 'cube'); t.add(t.preset('gravity-glitch'))
    t.engine.enqueueCollision(hit([1, 'cube'], 'floor')); t.step(0.1)
    expect(t.s.gravity).toBe('reverse')
    t.step(2.5); expect(t.s.gravity).toBe('reverse')
    t.step(1); expect(t.s.gravity).toBe('normal')
  })
  it('bounciness effect toggles and reverts', () => {
    const t = makeHost(); t.body(1, 'sphere')
    t.add({ name: 'b', trigger: { type: 'collision', a: 'sphere', b: 'floor' }, effect: { type: 'bounciness', bouncy: true }, cooldownS: 1, durationS: 1 })
    t.engine.enqueueCollision(hit([1, 'sphere'], 'floor')); t.step(0.1)
    expect(t.s.bouncy).toBe(true)
    t.step(1.2); expect(t.s.bouncy).toBe(false)
  })
  it('activation rules run once on demand and respect enabled state', () => {
    const t = makeHost(); t.body(1, 'sphere'); t.body(2, 'cube')
    const r = t.add({ name: 'kick all', trigger: { type: 'activation' }, effect: { type: 'impulse', target: 'both', direction: 'up', strength: 5 }, cooldownS: 1 })
    expect(t.engine.runActivation(r).ok).toBe(true)
    expect(t.s.impulses.map((i) => i.id).sort()).toEqual([1, 2])
    expect(t.engine.runActivation({ ...r, enabled: false }).ok).toBe(false)
  })
})

describe('safety', () => {
  it('cooldown blocks repeated firing until it elapses', () => {
    const t = makeHost(); t.body(1, 'sphere'); t.body(2, 'sphere'); t.add(t.preset('chain-reaction')) // 1.5 s
    t.engine.enqueueCollision(hit([1, 'sphere'], [2, 'sphere'])); t.step(0.3)
    t.body(3, 'sphere'); t.body(4, 'sphere')
    t.engine.enqueueCollision(hit([3, 'sphere'], [4, 'sphere'])); t.step(0.3)
    expect(t.s.spawned).toHaveLength(1)
    t.step(1.5)
    t.engine.enqueueCollision(hit([3, 'sphere'], [4, 'sphere'])); t.step(0.1)
    expect(t.s.spawned).toHaveLength(2)
  })
  it('dedupes the same collision reported from both bodies', () => {
    const t = makeHost(); t.body(1, 'sphere'); t.body(2, 'sphere'); t.add(t.preset('chain-reaction'))
    expect(t.engine.enqueueCollision(hit([1, 'sphere'], [2, 'sphere']))).toBe(true)
    expect(t.engine.enqueueCollision(hit([2, 'sphere'], [1, 'sphere']))).toBe(false)
    expect(t.engine.stats.deduped).toBe(1)
    expect(t.engine.pending).toBe(1)
  })
  it('respects the object cap', () => {
    const t = makeHost(); t.s.cap = 2; t.body(1, 'sphere'); t.body(2, 'sphere'); t.add(t.preset('chain-reaction'))
    t.engine.enqueueCollision(hit([1, 'sphere'], [2, 'sphere'])); t.step(0.1)
    expect(t.s.spawned).toHaveLength(0)
    expect(t.s.logs.some((l) => !l.ok && /cap/.test(l.text))).toBe(true)
  })
  it('stops chain reactions at the generation limit', () => {
    const t = makeHost(); t.body(1, 'sphere', LIMITS.maxGeneration); t.body(2, 'sphere', 0); t.add(t.preset('chain-reaction'))
    t.engine.enqueueCollision(hit([1, 'sphere'], [2, 'sphere'])); t.step(0.1)
    expect(t.s.spawned).toHaveLength(0)
  })
  it('simulated runaway chain stays bounded', () => {
    const t = makeHost(); t.body(1, 'sphere'); t.body(2, 'sphere')
    t.add({ ...t.preset('chain-reaction'), cooldownS: 0.5 })
    // every spawned sphere immediately "collides" with sphere 1 again
    for (let i = 0; i < 600; i++) {
      const last = t.s.spawned.at(-1)?.id ?? 2
      t.engine.enqueueCollision(hit([1, 'sphere'], [last, 'sphere'])); t.engine.advance(1 / 60)
    }
    expect(t.s.spawned.length).toBeLessThanOrEqual(LIMITS.maxGeneration)
  })
  it('limits effects per second across rules', () => {
    const t = makeHost(); t.body(1, 'sphere')
    for (let i = 0; i < 12; i++) t.add({ name: `k${i}`, trigger: { type: 'collision', a: 'sphere', b: 'floor' }, effect: { type: 'impulse', target: 'a', direction: 'up', strength: 5 }, cooldownS: 0.5 })
    t.engine.enqueueCollision(hit([1, 'sphere'], 'floor')); t.step(0.05)
    expect(t.s.impulses.length).toBeLessThanOrEqual(LIMITS.maxEffectsPerSecond)
  })
  it('rejects removed bodies safely', () => {
    const t = makeHost(); t.body(1, 'sphere'); t.add(t.preset('quantum-kick'))
    t.engine.enqueueCollision(hit([1, 'sphere'], [2, 'cube'])); t.s.bodies.delete(1); t.s.bodies.set(2, { kind: 'cube', pos: [0, 0, 0], gen: 0 })
    expect(() => t.step(0.1)).not.toThrow()
    expect(t.s.impulses).toHaveLength(0)
    expect(t.s.logs.some((l) => !l.ok)).toBe(true)
  })
  it('disabled rules never fire and enqueue nothing', () => {
    const t = makeHost(); t.body(1, 'sphere'); t.body(2, 'sphere'); const r = t.add(t.preset('chain-reaction')); r.enabled = false
    expect(t.engine.enqueueCollision(hit([1, 'sphere'], [2, 'sphere']))).toBe(false)
    t.step(0.1); expect(t.s.spawned).toHaveLength(0)
  })
  it('deleted rules stop firing', () => {
    const t = makeHost(); t.body(1, 'sphere'); t.body(2, 'sphere'); t.add(t.preset('chain-reaction'))
    t.s.rules.length = 0
    t.engine.enqueueCollision(hit([1, 'sphere'], [2, 'sphere'])); t.step(0.1)
    expect(t.s.spawned).toHaveLength(0)
  })
  it('discards events while frozen and freezes cooldown/duration clocks', () => {
    const t = makeHost(); t.body(1, 'cube'); t.add(t.preset('gravity-glitch'))
    t.s.paused = true
    expect(t.engine.enqueueCollision(hit([1, 'cube'], 'floor'))).toBe(false)
    expect(t.engine.stats.dropped).toBe(1)
    t.s.paused = false
    t.engine.enqueueCollision(hit([1, 'cube'], 'floor')); t.step(0.1)
    expect(t.s.gravity).toBe('reverse')
    t.s.paused = true; t.step(10)
    expect(t.s.gravity).toBe('reverse') // revert timer did not advance while frozen
    expect(t.engine.runActivation({ ...t.s.rules[0], trigger: { type: 'activation' } }).ok).toBe(false)
    t.s.paused = false; t.step(3.2)
    expect(t.s.gravity).toBe('normal')
  })
  it('events queued before a freeze are discarded', () => {
    const t = makeHost(); t.body(1, 'sphere'); t.body(2, 'sphere'); t.add(t.preset('chain-reaction'))
    t.engine.enqueueCollision(hit([1, 'sphere'], [2, 'sphere']))
    t.s.paused = true; t.engine.advance(0.1); t.s.paused = false; t.step(0.2)
    expect(t.s.spawned).toHaveLength(0)
  })
  it('reset clears queue, cooldowns and pending reverts', () => {
    const t = makeHost(); t.body(1, 'cube'); t.body(2, 'sphere'); t.body(3, 'sphere'); t.add(t.preset('gravity-glitch')); t.add(t.preset('chain-reaction'))
    t.engine.enqueueCollision(hit([1, 'cube'], 'floor')); t.step(0.1)
    t.engine.enqueueCollision(hit([2, 'sphere'], [3, 'sphere']))
    expect(t.engine.pending).toBe(1)
    t.engine.reset()
    expect(t.engine.pending).toBe(0)
    t.s.gravity = 'normal'
    t.step(5)
    expect(t.s.gravity).toBe('normal') // old revert did not fire
    t.engine.enqueueCollision(hit([1, 'cube'], 'floor')); t.step(0.1)
    expect(t.s.gravity).toBe('reverse') // cooldown cleared
  })
})
