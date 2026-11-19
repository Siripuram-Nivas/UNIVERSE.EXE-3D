import RAPIER from '@dimforge/rapier3d-compat'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { enterChallenge, exitChallenge, resetWorld, switchMode } from '../src/challenges/session'
import { breakReality, enterBreak, enterShared, remixShared, replayBreak, replayShared } from '../src/demo/session'
import { BREAK_RULE, breakRealityWorld } from '../src/demo/world'
import { sparkQueue } from '../src/effects'
import { engine } from '../src/reality/liveHost'
import { PRESETS } from '../src/reality/presets'
import { validateRule } from '../src/reality/validator'
import { addRule, getState, MAX_OBJECTS, resetUniverse, setGravityMode, setPaused, spawn } from '../src/store'
import { SHARE_LIMITS, decodeShare, encodeShare, shareUrl, tokenFromHash } from '../src/world/share'

beforeAll(async () => { await RAPIER.init() })
beforeEach(() => resetUniverse())
afterEach(() => { resetUniverse(); sparkQueue.length = 0 })

const strip = (w: ReturnType<typeof breakRealityWorld>) => w.objects.map(({ id: _id, ...rest }) => rest) // eslint-disable-line @typescript-eslint/no-unused-vars

describe('Break Reality experiment', () => {
  it('its rule passes the normal validator unchanged', () => {
    expect(validateRule(BREAK_RULE).ok).toBe(true)
  })
  it('the world is deterministic and within caps', () => {
    const a = breakRealityWorld(); const b = breakRealityWorld()
    expect(strip(a)).toEqual(strip(b))
    expect(a.objects.length).toBeLessThanOrEqual(MAX_OBJECTS)
    expect(a.objects.every((o) => o.quat)).toBe(true) // fixed rotations, no randomness
    expect(new Set(a.objects.map((o) => o.id)).size).toBe(a.objects.length)
  })
  it('enter -> ready, no rules, sandbox stashed, normal gravity', () => {
    spawn('cube'); setGravityMode('zero')
    enterBreak()
    const s = getState()
    expect(s.session).toEqual({ type: 'break', phase: 'ready' })
    expect(s.rules).toHaveLength(0)
    expect(s.gravityMode).toBe('normal')
    expect(s.stash).not.toBeNull()
  })
  it('Break Reality really reverses gravity through the rule engine, then the engine restores it', () => {
    enterBreak()
    expect(breakReality()).toBe(true)
    const s = getState()
    expect(s.session).toEqual({ type: 'break', phase: 'broken' })
    expect(s.gravityMode).toBe('reverse')
    expect(s.rules.map((r) => r.name)).toEqual(['Reality Break'])
    expect(s.burst.id).toBeGreaterThan(0)
    expect(sparkQueue.some((b) => b.color === 'orange')).toBe(true)
    for (let i = 0; i < 20; i++) engine.advance(0.1) // 2.0 s of engine time
    expect(getState().gravityMode).toBe('reverse')
    for (let i = 0; i < 10; i++) engine.advance(0.1) // past 2.5 s
    expect(getState().gravityMode).toBe('normal')
  })
  it('works if time was frozen, cannot fire twice, and does nothing outside the experiment', () => {
    expect(breakReality()).toBe(false) // not in a session
    expect(getState().gravityMode).toBe('normal')
    enterBreak(); setPaused(true)
    expect(breakReality()).toBe(true)
    expect(getState().paused).toBe(false)
    expect(breakReality()).toBe(false)
    expect(getState().rules).toHaveLength(1)
  })
  it('replay restores the initial state and leaves no stale rule or revert timer', () => {
    enterBreak(); breakReality()
    replayBreak()
    const s = getState()
    expect(s.session).toEqual({ type: 'break', phase: 'ready' })
    expect(s.gravityMode).toBe('normal')
    expect(s.rules).toHaveLength(0)
    engine.advance(0.1) // the engine sees the reset
    for (let i = 0; i < 40; i++) engine.advance(0.1)
    expect(getState().gravityMode).toBe('normal')
    expect(breakReality()).toBe(true) // can be run again
  })
  it('the reset button replays; exit restores the sandbox exactly', () => {
    spawn('sphere'); setGravityMode('zero'); addRule(PRESETS[1].draft, 'quantum-kick')
    const ids = getState().objects.map((o) => o.id)
    enterBreak(); breakReality(); resetWorld()
    expect(getState().session).toMatchObject({ phase: 'ready' })
    exitChallenge()
    const s = getState()
    expect(s.session).toBeNull(); expect(s.stash).toBeNull()
    expect(s.objects.map((o) => o.id)).toEqual(ids)
    expect(s.gravityMode).toBe('zero')
    expect(s.rules.map((r) => r.presetId)).toEqual(['quantum-kick'])
  })
  it('Try Challenges after the experiment keeps the original sandbox', () => {
    spawn('cube'); const ids = getState().objects.map((o) => o.id)
    enterBreak(); breakReality()
    exitChallenge(); switchMode('challenges')
    expect(getState().mode).toBe('challenges')
    enterChallenge('gravity-escape')
    exitChallenge()
    expect(getState().objects.map((o) => o.id)).toEqual(ids)
  })
  it('entering a challenge directly from the experiment still stashes the real sandbox', () => {
    spawn('cube'); const ids = getState().objects.map((o) => o.id)
    enterBreak(); enterChallenge('quantum-launch')
    expect(getState().session).toBeNull()
    exitChallenge()
    expect(getState().objects.map((o) => o.id)).toEqual(ids)
  })
  it('in headless Rapier the experiment objects really rise under reversed gravity and fall back', () => {
    const w = breakRealityWorld()
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    world.createCollider(RAPIER.ColliderDesc.cuboid(9, 0.5, 9).setTranslation(0, -0.5, 0))
    world.createCollider(RAPIER.ColliderDesc.cuboid(9, 0.5, 9).setTranslation(0, 15.5, 0))
    const bodies = w.objects.map((o) => {
      const b = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(...o.pos))
      world.createCollider(o.kind === 'sphere' ? RAPIER.ColliderDesc.ball(0.45) : RAPIER.ColliderDesc.cuboid(0.35, 0.35, 0.35), b)
      return b
    })
    for (let i = 0; i < 90; i++) world.step()
    const avg = () => bodies.reduce((a, b) => a + b.translation().y, 0) / bodies.length
    const rest = avg()
    expect(rest).toBeLessThan(1)
    world.gravity = { x: 0, y: 9.81, z: 0 }; world.forEachRigidBody((b) => b.wakeUp())
    for (let i = 0; i < 90; i++) world.step()
    expect(avg()).toBeGreaterThan(rest + 5) // genuinely lifted by physics
    world.gravity = { x: 0, y: -9.81, z: 0 }
    for (let i = 0; i < 150; i++) world.step()
    expect(avg()).toBeLessThan(2)
  })
})

describe('Reality DNA share links', () => {
  const sample = () => {
    spawn('sphere'); spawn('cube'); spawn('sphere', true)
    addRule(PRESETS[0].draft, 'chain-reaction'); addRule(PRESETS[2].draft, 'gravity-glitch')
    setGravityMode('reverse')
    const s = getState()
    return { objects: s.objects, rules: s.rules, gravityMode: s.gravityMode, gravityMagnitude: s.gravityMagnitude, bouncy: s.bouncy, paused: s.paused }
  }

  it('round-trips objects, rules, gravity and stays compact', () => {
    const w = sample()
    const e = encodeShare(w)
    expect(e.ok).toBe(true); if (!e.ok) return
    expect(e.token.length).toBeLessThan(SHARE_LIMITS.chars)
    const d = decodeShare(e.token)
    expect(d.ok).toBe(true); if (!d.ok) return
    expect(d.world.objects).toHaveLength(w.objects.length)
    expect(d.world.objects.map((o) => o.kind)).toEqual(w.objects.map((o) => o.kind))
    expect(d.world.gravityMode).toBe('reverse')
    expect(d.world.rules.map((r) => r.name)).toEqual(['Chain Reaction', 'Gravity Glitch'])
    expect(d.world.paused).toBe(false)
  })
  it('does not leak ids, velocities, tags or selection', () => {
    const w = sample()
    w.objects[0] = { ...w.objects[0], vel: [9, 9, 9], angvel: [1, 1, 1], tag: 'secret-tag' }
    const e = encodeShare(w); if (!e.ok) throw new Error(e.error)
    const raw = atob(e.token.replace(/-/g, '+').replace(/_/g, '/'))
    expect(raw).not.toMatch(/secret-tag|vel|angvel|"id"/)
    const d = decodeShare(e.token); if (!d.ok) throw new Error(d.error)
    expect(d.world.objects.every((o) => o.vel === undefined && o.tag === undefined)).toBe(true)
  })
  it('refuses to encode too many objects, too many rules, or an empty world', () => {
    const w = sample()
    const many = Array.from({ length: SHARE_LIMITS.objects + 1 }, (_, i) => ({ ...w.objects[0], id: i + 1 }))
    expect(encodeShare({ ...w, objects: many }).ok).toBe(false)
    expect(encodeShare({ ...w, rules: Array.from({ length: SHARE_LIMITS.rules + 1 }, () => w.rules[0]) }).ok).toBe(false)
    expect(encodeShare({ ...w, objects: [] }).ok).toBe(false)
  })
  it('rejects malformed, oversized, wrong-version and invalid links with clear errors', () => {
    const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const good = { v: 1, g: 'n', m: 9.81, b: 0, o: [[0, 0, 1, 1, 1, 0]], r: [] }
    for (const bad of ['', 'not base64!!', '%%%', 'AAAA', b64('plain string'), b64([1, 2]), b64({ ...good, v: 2 }), b64({ ...good, g: 'x' }),
      b64({ ...good, o: [] }), b64({ ...good, o: [[0, 0, 1, 1]] }), b64({ ...good, o: [[0, 0, 'a', 1, 1, 0]] }),
      b64({ ...good, o: Array.from({ length: SHARE_LIMITS.objects + 1 }, () => [0, 0, 1, 1, 1, 0]) }),
      'A'.repeat(SHARE_LIMITS.chars + 1)]) {
      const r = decodeShare(bad)
      expect(r.ok, bad.slice(0, 30)).toBe(false)
      if (!r.ok) expect(r.error.length).toBeGreaterThan(10)
    }
    expect(decodeShare(b64(good)).ok).toBe(true)
  })
  it('clamps positions and drops rules outside the allowlist; never evaluates anything', () => {
    const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const evil = { v: 1, g: 'n', m: 9999, b: 1, o: [[0, 0, 500, -500, 500, 99]], r: [
      { trigger: { type: 'timer' }, effect: { type: 'eval', code: 'alert(1)' } },
      { name: '<b>x</b>', trigger: { type: 'activation' }, effect: { type: 'burst', color: 'lime' }, cooldownS: 1 },
    ] }
    const d = decodeShare(b64(evil)); if (!d.ok) throw new Error(d.error)
    expect(d.world.objects[0].pos).toEqual([7.5, 0.3, 7.5])
    expect(d.world.objects[0].gen).toBe(3)
    expect(d.world.gravityMagnitude).toBe(30)
    expect(d.world.rules).toHaveLength(1)
    expect(d.world.rules[0].name).not.toContain('<')
    expect(d.notes.length).toBeGreaterThan(0)
  })
  it('url helpers only accept the #w= fragment', () => {
    expect(tokenFromHash('#w=abc')).toBe('abc')
    expect(tokenFromHash('#other=abc')).toBeNull()
    expect(tokenFromHash('')).toBeNull()
    expect(shareUrl('tok', 'https://x.test/app/?a=1#old')).toBe('https://x.test/app/?a=1#w=tok')
  })
  it('Play loads the shared world with its rules, Replay restarts it, Exit restores mine, Remix keeps it', () => {
    const w = sample(); const e = encodeShare(w); if (!e.ok) throw new Error(e.error)
    const d = decodeShare(e.token); if (!d.ok) throw new Error(d.error)
    resetUniverse(); spawn('cube'); const mine = getState().objects.map((o) => o.id)
    enterShared(d.world)
    expect(getState().session?.type).toBe('shared')
    expect(getState().objects).toHaveLength(w.objects.length)
    expect(getState().rules).toHaveLength(2)
    expect(getState().gravityMode).toBe('reverse')
    setGravityMode('normal'); replayShared()
    expect(getState().gravityMode).toBe('reverse')
    exitChallenge()
    expect(getState().objects.map((o) => o.id)).toEqual(mine)
    expect(getState().rules).toHaveLength(0)
    enterShared(d.world); remixShared()
    expect(getState().session).toBeNull(); expect(getState().stash).toBeNull()
    expect(getState().objects).toHaveLength(w.objects.length)
    expect(getState().rules).toHaveLength(2)
  })
})
