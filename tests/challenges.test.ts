import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHALLENGES, getChallenge } from '../src/challenges/defs'
import { enterChallenge, exitChallenge, restartChallenge, switchMode } from '../src/challenges/session'
import { initialChallengeState, reduceChallenge } from '../src/challenges/state'
import { activateDraft } from '../src/reality/liveHost'
import { PRESETS } from '../src/reality/presets'
import { addRule, challengeEvent, getState, resetUniverse, setGravityMode, spawn } from '../src/store'
import { runCommand } from '../src/commands'
import { buildChallengeWorld } from './rapierHarness'

const [ch1, ch2, ch3] = CHALLENGES
function seeded(seed: number) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 } }

describe('challenge reducer (pure)', () => {
  it('defines three distinct challenges with explicit win conditions', () => {
    expect(CHALLENGES.map((c) => c.id)).toEqual(['gravity-escape', 'chain-reaction', 'quantum-launch'])
    for (const c of CHALLENGES) expect(c.objective && c.hint && c.title).toBeTruthy()
    expect(getChallenge('nope')).toBeUndefined()
  })
  it('goal events only count for the tagged target', () => {
    const s0 = initialChallengeState(ch1)
    expect(reduceChallenge(s0, ch1, { type: 'goal' })).toBe(s0)
    expect(reduceChallenge(s0, ch1, { type: 'goal', tag: 'decoy' })).toBe(s0)
    const s1 = reduceChallenge(s0, ch1, { type: 'goal', tag: 'target' })
    expect(s1).toMatchObject({ status: 'complete', progress: 1 })
  })
  it('completion happens once; later events are ignored', () => {
    const done = reduceChallenge(initialChallengeState(ch1), ch1, { type: 'goal', tag: 'target' })
    expect(reduceChallenge(done, ch1, { type: 'goal', tag: 'target' })).toBe(done)
    expect(reduceChallenge(done, ch1, { type: 'fired' })).toBe(done)
  })
  it('spawn challenge counts rule spawns up to the target and no further', () => {
    let s = initialChallengeState(ch2)
    const need = ch2.win.type === 'spawns' ? ch2.win.count : 0
    for (let i = 0; i < need - 1; i++) s = reduceChallenge(s, ch2, { type: 'spawn' })
    expect(s.status).toBe('playing')
    s = reduceChallenge(s, ch2, { type: 'spawn' })
    expect(s.status).toBe('complete')
    expect(reduceChallenge(s, ch2, { type: 'spawn' }).progress).toBe(s.progress)
    expect(reduceChallenge(initialChallengeState(ch2), ch2, { type: 'goal', tag: 'target' }).progress).toBe(0)
  })
  it('Quantum Launch needs the kick to have fired before the goal counts (failure case)', () => {
    let s = initialChallengeState(ch3)
    s = reduceChallenge(s, ch3, { type: 'goal', tag: 'target' })
    expect(s.status).toBe('playing')
    s = reduceChallenge(s, ch3, { type: 'fired' })
    s = reduceChallenge(s, ch3, { type: 'goal', tag: 'target' })
    expect(s.status).toBe('complete')
  })
  it('events for another challenge id are ignored', () => {
    const s = initialChallengeState(ch1)
    expect(reduceChallenge(s, ch2, { type: 'spawn' })).toBe(s)
  })
})

describe('headless Rapier: goals are reached through real physics and are solvable', () => {
  it('Gravity Escape: reversing gravity at the right time delivers the sphere; too early does not', async () => {
    const early = await buildChallengeWorld(ch1)
    early.setGravity('reverse'); early.run(6)
    expect(early.state.status).toBe('playing') // trapped under the shelf
    const solved = await buildChallengeWorld(ch1)
    solved.run(6); solved.setGravity('reverse'); solved.run(5)
    expect(solved.state).toMatchObject({ status: 'complete', progress: 1 })
  })
  it('Gravity Escape: untagged objects entering the goal sensor do not complete it', async () => {
    const def = structuredClone(ch1)
    delete def.objects[0].tag
    const w = await buildChallengeWorld(def)
    w.run(6); w.setGravity('reverse'); w.run(6)
    expect(w.state.status).toBe('playing')
  })
  it('Chain Reaction: a single nudge makes the rule spawn enough spheres (seeded runs)', async () => {
    for (let seed = 1; seed <= 6; seed++) {
      vi.spyOn(Math, 'random').mockImplementation(seeded(seed))
      const w = await buildChallengeWorld(ch2)
      const before = w.bodyCount
      w.nudge(w.idByTag('pusher'), [5, 0, 0]); w.run(12)
      expect(w.state.status).toBe('complete')
      expect(w.bodyCount - before).toBeGreaterThanOrEqual(3) // objects really exist in the world
      expect(w.bodyCount).toBeLessThanOrEqual(60)
    }
    vi.restoreAllMocks()
  })
  it('Chain Reaction: without a collision nothing counts', async () => {
    const w = await buildChallengeWorld(ch2)
    w.run(10)
    expect(w.state.progress).toBe(0)
  })
  it('Quantum Launch: nudging the sphere into the cube fires the kick and reaches the goal', async () => {
    for (const v of [3, 5, 8]) {
      const w = await buildChallengeWorld(ch3)
      w.nudge(w.idByTag('target'), [v, 0, 0]); w.run(7)
      expect(w.state.fired).toBe(true)
      expect(w.state.status).toBe('complete')
    }
  })
  it('Quantum Launch: without the kick rule the goal is not reached', async () => {
    const w = await buildChallengeWorld({ ...ch3, presets: [] })
    w.nudge(w.idByTag('target'), [5, 0, 0]); w.run(7)
    expect(w.state.status).toBe('playing')
  })
})

describe('sessions: enter, restart, exit, modes', () => {
  beforeEach(() => resetUniverse())
  afterEach(() => resetUniverse())

  it('enters a challenge with only the level objects, tagged target, level rules and normal gravity', () => {
    setGravityMode('reverse'); spawn('cube'); addRule(PRESETS[0].draft, 'chain-reaction')
    expect(enterChallenge('quantum-launch')).toBe(true)
    const s = getState()
    expect(s.mode).toBe('challenges')
    expect(s.objects).toHaveLength(ch3.objects.length)
    expect(s.objects.filter((o) => o.tag === 'target')).toHaveLength(1)
    expect(s.rules.map((r) => r.presetId)).toEqual(['quantum-kick'])
    expect(s.gravityMode).toBe('normal')
    expect(s.paused).toBe(false)
    expect(s.challenge).toMatchObject({ id: 'quantum-launch', status: 'playing', progress: 0 })
  })
  it('restart rebuilds the level with fresh ids and zero progress', () => {
    enterChallenge('chain-reaction')
    const ids = getState().objects.map((o) => o.id)
    challengeEvent({ type: 'spawn' })
    expect(getState().challenge!.progress).toBe(1)
    const epoch = getState().epoch
    expect(restartChallenge()).toBe(true)
    expect(getState().challenge).toMatchObject({ progress: 0, status: 'playing' })
    expect(getState().objects.map((o) => o.id).some((id) => ids.includes(id))).toBe(false)
    expect(getState().epoch).toBe(epoch + 1)
  })
  it('sandbox world events cannot complete a level; completion is recorded once', () => {
    expect(challengeEvent({ type: 'goal', tag: 'target' })).toBe(false) // no active challenge
    enterChallenge('gravity-escape')
    expect(challengeEvent({ type: 'goal', tag: 'target' })).toBe(true)
    expect(challengeEvent({ type: 'goal', tag: 'target' })).toBe(false)
    expect(getState().completed).toContain('gravity-escape')
  })
  it('exit restores the sandbox exactly as it was when the challenge began', () => {
    setGravityMode('zero'); spawn('sphere'); spawn('cube'); addRule(PRESETS[1].draft, 'quantum-kick')
    const before = getState()
    const ids = before.objects.map((o) => o.id)
    enterChallenge('gravity-escape')
    enterChallenge('chain-reaction') // switching levels keeps the ORIGINAL sandbox stash
    exitChallenge()
    const s = getState()
    expect(s.mode).toBe('sandbox')
    expect(s.challenge).toBeNull()
    expect(s.objects.map((o) => o.id)).toEqual(ids)
    expect(s.gravityMode).toBe('zero')
    expect(s.rules.map((r) => r.presetId)).toEqual(['quantum-kick'])
    expect(s.stash).toBeNull()
  })
  it('switching to the challenge menu and back does not touch the world', () => {
    spawn('cube')
    const objects = getState().objects
    switchMode('challenges'); expect(getState().mode).toBe('challenges')
    switchMode('sandbox'); expect(getState().mode).toBe('sandbox')
    expect(getState().objects).toBe(objects)
  })
  it('spawning, rule editing and the reset command behave sensibly inside a challenge', () => {
    enterChallenge('chain-reaction')
    const n = getState().objects.length
    expect(spawn('sphere')).toBe(false)
    expect(runCommand('spawn cube').ok).toBe(false)
    expect(activateDraft(PRESETS[1].draft).ok).toBe(false)
    expect(getState().objects).toHaveLength(n)
    runCommand('reset universe')
    expect(getState().challenge).toMatchObject({ id: 'chain-reaction', progress: 0 }) // restarted, still in the level
  })
})

describe('challenge correctness hardening', () => {
  beforeEach(() => resetUniverse())
  afterEach(() => resetUniverse())

  it('ignores goal events from object ids that are not in the current world (stale callbacks)', () => {
    enterChallenge('gravity-escape')
    expect(challengeEvent({ type: 'goal', tag: 'target', id: 99999 })).toBe(false)
    expect(getState().challenge!.status).toBe('playing')
    const target = getState().objects.find((o) => o.tag === 'target')!
    expect(challengeEvent({ type: 'goal', tag: 'target', id: target.id })).toBe(true)
  })
  it('a finished level never leaks progress into the next one', () => {
    enterChallenge('chain-reaction')
    challengeEvent({ type: 'spawn' }); challengeEvent({ type: 'spawn' }); challengeEvent({ type: 'spawn' })
    expect(getState().challenge!.status).toBe('complete')
    enterChallenge('quantum-launch')
    expect(getState().challenge).toMatchObject({ id: 'quantum-launch', status: 'playing', progress: 0, fired: false })
    const target = getState().objects.find((o) => o.tag === 'target')!
    expect(challengeEvent({ type: 'goal', tag: 'target', id: target.id })).toBe(false) // kick has not fired
    expect(challengeEvent({ type: 'spawn' })).toBe(false)
  })
  it('replacing the world clears queued sparks and leaves no stale rules', async () => {
    const { sparkQueue, emitSparks } = await import('../src/effects')
    const { addRule } = await import('../src/store')
    addRule(PRESETS[0].draft, 'chain-reaction')
    emitSparks([0, 1, 0], 'lime')
    enterChallenge('gravity-escape')
    expect(sparkQueue.some((b) => b.color === 'lime')).toBe(false) // only the new level's own start effect remains
    sparkQueue.length = 0
    expect(getState().rules).toHaveLength(0) // gravity-escape has no rules; the sandbox rule is stashed, not active
    exitChallenge()
    expect(getState().rules.map((r) => r.presetId)).toEqual(['chain-reaction'])
  })
})
