import { beforeEach, describe, expect, it } from 'vitest'
import { runCommand, SUGGESTIONS } from '../src/commands'
import { getState, MAX_OBJECTS, resetUniverse, spawn } from '../src/store'

beforeEach(() => resetUniverse())

describe('command interpreter', () => {
  it('lists the nine supported commands', () => expect(SUGGESTIONS).toHaveLength(9))
  it('gravity commands change state', () => {
    expect(runCommand('reverse gravity').ok).toBe(true); expect(getState().gravityMode).toBe('reverse')
    runCommand('zero gravity'); expect(getState().gravityMode).toBe('zero')
    runCommand('normal gravity'); expect(getState().gravityMode).toBe('normal')
  })
  it('freeze and resume time', () => {
    runCommand('freeze time'); expect(getState().paused).toBe(true)
    runCommand('resume time'); expect(getState().paused).toBe(false)
  })
  it('spawns objects and respects the cap', () => {
    const before = getState().objects.length
    runCommand('spawn sphere'); runCommand('spawn cube')
    expect(getState().objects).toHaveLength(before + 2)
    while (spawn('cube')) { /* fill */ }
    const r = runCommand('spawn cube')
    expect(r.ok).toBe(false)
    expect(getState().objects).toHaveLength(MAX_OBJECTS)
  })
  it('bouncy and reset', () => {
    runCommand('make everything bouncy'); expect(getState().bouncy).toBe(true)
    runCommand('Reset Universe!'); expect(getState().bouncy).toBe(false)
  })
  it('normalises case, punctuation and aliases', () => {
    expect(runCommand('  REVERSE   Gravity. ').ok).toBe(true)
    expect(runCommand('no gravity').ok).toBe(true)
  })
  it('rejects unsupported and empty input with a helpful message', () => {
    const r = runCommand('make it rain')
    expect(r.ok).toBe(false)
    expect(r.message).toContain('reverse gravity')
    expect(runCommand('   ').ok).toBe(false)
    expect(getState().feedback.ok).toBe(false)
  })
})
