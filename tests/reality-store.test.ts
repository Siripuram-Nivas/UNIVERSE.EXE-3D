import { beforeEach, describe, expect, it } from 'vitest'
import { PRESETS } from '../src/reality/presets'
import { LIMITS } from '../src/reality/types'
import { addRule, clearRules, getState, removeRule, resetUniverse, toggleRule } from '../src/store'

beforeEach(() => resetUniverse())
const draft = PRESETS[0].draft

describe('rule list state', () => {
  it('adds with unique ids, toggles, removes and clears', () => {
    const a = addRule(draft)!; const b = addRule(PRESETS[1].draft, 'quantum-kick')!
    expect(a.id).not.toBe(b.id)
    expect(getState().rules).toHaveLength(2)
    toggleRule(a.id); expect(getState().rules[0].enabled).toBe(false)
    toggleRule(a.id); expect(getState().rules[0].enabled).toBe(true)
    removeRule(a.id); expect(getState().rules.map((r) => r.id)).toEqual([b.id])
    clearRules(); expect(getState().rules).toHaveLength(0)
  })
  it('caps the number of rules', () => {
    for (let i = 0; i < LIMITS.maxRules; i++) expect(addRule(draft)).not.toBeNull()
    expect(addRule(draft)).toBeNull()
  })
  it('reset removes rules, drops proposals and signals the engine', () => {
    addRule(draft)
    const before = getState().resetCount
    resetUniverse()
    expect(getState().rules).toHaveLength(0)
    expect(getState().proposal).toBeNull()
    expect(getState().resetCount).toBe(before + 1)
  })
})
