import { beforeEach, describe, expect, it } from 'vitest'
import { PRESETS } from '../src/reality/presets'
import { addRule, getState, MAX_OBJECTS, replaceWorld, resetUniverse, spawn, setGravityMode, setBouncy } from '../src/store'
import { deleteSlot, readSlot, saveToWorld, toSave, validateSave, writeSlot, type Store } from '../src/world/save'
import { LIMITS } from '../src/reality/types'

const fakeStore = (): Store & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) }
}
const world = () => ({
  objects: [
    { id: 5, kind: 'sphere' as const, heavy: false, pos: [1, 2, 3] as [number, number, number], gen: 1, vel: [1, 0, 0] as [number, number, number], quat: [0, 0, 0, 1] as [number, number, number, number] },
    { id: 9, kind: 'cube' as const, heavy: true, pos: [-2, 1, 0] as [number, number, number] },
  ],
  rules: [{ ...PRESETS[0].draft, id: 'x', enabled: false, presetId: 'chain-reaction' }],
  gravityMode: 'reverse' as const, gravityMagnitude: 12, bouncy: true, paused: true,
})
beforeEach(() => resetUniverse())

describe('save schema', () => {
  it('round-trips a world through JSON', () => {
    const json = JSON.parse(JSON.stringify(toSave(world(), 'A')))
    const v = validateSave(json)
    expect(v.ok).toBe(true)
    if (!v.ok) return
    const w = saveToWorld(v.save)
    expect(w.objects.map((o) => o.id)).toEqual([5, 9])
    expect(w.objects[0]).toMatchObject({ gen: 1, vel: [1, 0, 0] })
    expect(w.rules[0]).toMatchObject({ enabled: false, presetId: 'chain-reaction' })
    expect(w).toMatchObject({ gravityMode: 'reverse', gravityMagnitude: 12, bouncy: true, paused: true })
  })
  it('rejects corrupt and outdated data without throwing', () => {
    const good = JSON.parse(JSON.stringify(toSave(world(), 'A')))
    const bad: unknown[] = [
      null, 'x', 42, [], {}, { ...good, version: 2 }, { ...good, version: undefined },
      { ...good, gravityMode: 'sideways' }, { ...good, gravityMagnitude: NaN }, { ...good, bouncy: 'yes' },
      { ...good, objects: 'nope' }, { ...good, objects: [{ id: 1, kind: 'sphere', pos: [0, 0] }] },
      { ...good, objects: [{ id: 1, kind: 'planet', pos: [0, 0, 0] }] },
      { ...good, objects: [good.objects[0], { ...good.objects[0] }] },
      { ...good, objects: [{ id: 1.5, kind: 'cube', pos: [0, 0, 0] }] },
      { ...good, objects: [{ id: 1, kind: 'cube', pos: [0, Infinity, 0] }] },
    ]
    for (const b of bad) expect(validateSave(b).ok, JSON.stringify(b)?.slice(0, 60)).toBe(false)
  })
  it('enforces the object cap', () => {
    const many = Array.from({ length: MAX_OBJECTS + 1 }, (_, i) => ({ id: i + 1, kind: 'cube', heavy: false, pos: [0, 5, 0] }))
    const v = validateSave({ ...toSave(world(), 'A'), objects: many })
    expect(v.ok).toBe(false)
    const exact = many.slice(0, MAX_OBJECTS)
    expect(validateSave({ ...toSave(world(), 'A'), objects: exact }).ok).toBe(true)
  })
  it('clamps positions into the chamber and skips invalid or excess rules', () => {
    const save = toSave(world(), 'A') as unknown as Record<string, unknown>
    save.objects = [{ id: 1, kind: 'cube', heavy: false, pos: [99, -50, 99] }]
    save.rules = [
      { trigger: { type: 'timer' }, effect: { type: 'eval' } },
      ...Array.from({ length: LIMITS.maxRules + 3 }, () => ({ ...PRESETS[1].draft, enabled: true })),
    ]
    const v = validateSave(save)
    expect(v.ok).toBe(true)
    if (!v.ok) return
    expect(v.save.objects[0].pos).toEqual([7.5, 0.3, 7.5])
    expect(v.save.rules.length).toBeLessThanOrEqual(LIMITS.maxRules)
    expect(v.notes.length).toBeGreaterThan(0)
  })
})

describe('local slots', () => {
  it('writes, reads, lists as empty/ok/corrupt and deletes', () => {
    const st = fakeStore()
    expect(readSlot(1, st)).toEqual({ status: 'empty' })
    expect(writeSlot(1, toSave(world(), 'A'), st).ok).toBe(true)
    expect(readSlot(1, st).status).toBe('ok')
    st.data.set('universe-exe:save:2', '{not json')
    expect(readSlot(2, st)).toMatchObject({ status: 'corrupt' })
    st.data.set('universe-exe:save:3', JSON.stringify({ version: 1 }))
    expect(readSlot(3, st).status).toBe('corrupt')
    st.data.set('universe-exe:save:3', 'x'.repeat(300_000))
    expect(readSlot(3, st)).toMatchObject({ status: 'corrupt', error: 'Save is too large.' })
    expect(deleteSlot(1, st)).toBe(true)
    expect(readSlot(1, st)).toEqual({ status: 'empty' })
  })
  it('handles unavailable or full storage', () => {
    expect(readSlot(1, null).status).toBe('corrupt')
    expect(writeSlot(1, toSave(world(), 'A'), null).ok).toBe(false)
    const full: Store = { getItem: () => null, setItem: () => { throw new Error('quota') }, removeItem: () => { throw new Error('x') } }
    expect(writeSlot(1, toSave(world(), 'A'), full).ok).toBe(false)
    expect(deleteSlot(1, full)).toBe(false)
    const throwing: Store = { getItem: () => { throw new Error('blocked') }, setItem: () => {}, removeItem: () => {} }
    expect(readSlot(1, throwing).status).toBe('corrupt')
  })
})

describe('loading into the live store', () => {
  it('replaces the world, keeps ids unique, restores rules and bumps the epoch', () => {
    setGravityMode('zero'); setBouncy(true); spawn('cube')
    const epoch = getState().epoch
    const v = validateSave(JSON.parse(JSON.stringify(toSave(world(), 'A'))))
    if (!v.ok) throw new Error(v.error)
    replaceWorld(saveToWorld(v.save))
    const s = getState()
    expect(s.objects.map((o) => o.id)).toEqual([5, 9])
    expect(s.gravityMode).toBe('reverse')
    expect(s.bouncy).toBe(true)
    expect(s.paused).toBe(true)
    expect(s.rules).toHaveLength(1)
    expect(s.rules[0].id).not.toBe('x')
    expect(s.rules[0].presetId).toBe('chain-reaction')
    expect(s.epoch).toBe(epoch + 1)
    resetUniverse()
    replaceWorld(saveToWorld(v.save))
    spawn('sphere')
    const ids = getState().objects.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length) // new objects never collide with loaded ids
    expect(Math.max(...ids)).toBeGreaterThan(9)
  })
  it('a loaded world at the cap cannot spawn more', () => {
    const many = Array.from({ length: MAX_OBJECTS }, (_, i) => ({ id: i + 1, kind: 'cube', heavy: false, pos: [0, 5, 0] }))
    const v = validateSave({ ...toSave(world(), 'A'), objects: many, rules: [] })
    if (!v.ok) throw new Error(v.error)
    replaceWorld(saveToWorld(v.save))
    expect(spawn('cube')).toBe(false)
    addRule(PRESETS[0].draft)
    expect(getState().objects).toHaveLength(MAX_OBJECTS)
  })
})
