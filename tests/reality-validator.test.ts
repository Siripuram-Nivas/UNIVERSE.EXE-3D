import { describe, expect, it } from 'vitest'
import { PRESETS } from '../src/reality/presets'
import { validateRule } from '../src/reality/validator'

const ok = (input: unknown) => {
  const v = validateRule(input)
  if (!v.ok) throw new Error(v.errors.join(' '))
  return v
}
const base = { trigger: { type: 'collision', a: 'sphere', b: 'sphere' }, effect: { type: 'spawn', kind: 'sphere' } }

describe('validateRule', () => {
  it('accepts a valid rule and fills defaults', () => {
    const v = ok(base)
    expect(v.draft.effect).toEqual({ type: 'spawn', kind: 'sphere', at: 'collision' })
    expect(v.draft.cooldownS).toBe(1)
    expect(v.draft.name.length).toBeGreaterThan(0)
  })
  it('accepts all three presets unchanged', () => {
    for (const p of PRESETS) expect(ok(p.draft).draft.trigger).toEqual(p.draft.trigger)
  })
  it('rejects unsupported triggers', () => {
    const v = validateRule({ ...base, trigger: { type: 'timer', every: 1 } })
    expect(v.ok).toBe(false)
    expect(validateRule({ ...base, trigger: { type: 'collision', a: 'planet', b: 'sphere' } }).ok).toBe(false)
    expect(validateRule({ ...base, trigger: { type: 'collision', a: 'sphere', b: 'blackhole' } }).ok).toBe(false)
  })
  it('rejects unsupported effects and objects', () => {
    expect(validateRule({ ...base, effect: { type: 'explode', count: 1000 } }).ok).toBe(false)
    expect(validateRule({ ...base, effect: { type: 'spawn', kind: 'blackhole' } }).ok).toBe(false)
    expect(validateRule({ ...base, effect: { type: 'eval', code: 'alert(1)' } }).ok).toBe(false)
    expect(validateRule({ ...base, effect: { type: 'gravity', mode: 'sideways' } }).ok).toBe(false)
  })
  it('rejects non-objects and missing parts', () => {
    for (const bad of [null, 'x', 5, [], {}, { trigger: { type: 'activation' } }]) expect(validateRule(bad).ok).toBe(false)
  })
  it('clamps numeric parameters and reports it', () => {
    const v = ok({ ...base, effect: { type: 'impulse', target: 'a', direction: 'up', strength: 9999 }, cooldownS: 0 })
    expect(v.draft.effect).toMatchObject({ strength: 30 })
    expect(v.draft.cooldownS).toBe(0.5)
    expect(v.notes.length).toBe(2)
    const d = ok({ trigger: { type: 'activation' }, effect: { type: 'gravity', mode: 'zero' }, durationS: 1e6 })
    expect(d.draft.durationS).toBe(30)
  })
  it('rejects non-finite or non-numeric parameters', () => {
    expect(validateRule({ ...base, cooldownS: 'fast' }).ok).toBe(false)
    expect(validateRule({ ...base, cooldownS: NaN }).ok).toBe(false)
    expect(validateRule({ ...base, effect: { type: 'impulse', strength: Infinity } }).ok).toBe(false)
  })
  it('drops duration for effects that cannot be time-limited', () => {
    const v = ok({ ...base, durationS: 5 })
    expect(v.draft.durationS).toBeUndefined()
    expect(v.notes.join(' ')).toMatch(/ignored/)
  })
  it('enforces cross-field constraints', () => {
    expect(validateRule({ trigger: { type: 'activation' }, effect: { type: 'spawn', kind: 'cube', at: 'collision' } }).ok).toBe(false)
    expect(validateRule({ trigger: { type: 'activation' }, effect: { type: 'impulse', direction: 'away' } }).ok).toBe(false)
    expect(validateRule({ trigger: { type: 'collision', a: 'cube', b: 'floor' }, effect: { type: 'impulse', target: 'b' } }).ok).toBe(false)
    const v = ok({ trigger: { type: 'activation' }, effect: { type: 'impulse', direction: 'up' } })
    expect(v.draft.effect).toMatchObject({ target: 'both' })
  })
  it('sanitises and truncates names', () => {
    const v = ok({ ...base, name: '<img onerror=x>' + 'a'.repeat(200) })
    expect(v.draft.name).not.toContain('<')
    expect(v.draft.name.length).toBeLessThanOrEqual(60)
  })
})
