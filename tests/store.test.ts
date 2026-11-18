import { beforeEach, describe, expect, it } from 'vitest'
import {
  getState, gravityVector, MAX_OBJECTS, resetUniverse, select, selectNext,
  setBouncy, setGravityMode, setPaused, spawn, clearObjects,
} from '../src/store'

beforeEach(() => resetUniverse())

describe('gravity', () => {
  it('maps modes to vectors', () => {
    expect(gravityVector({ gravityMode: 'normal', gravityMagnitude: 9.81 })).toEqual([0, -9.81, 0])
    expect(gravityVector({ gravityMode: 'reverse', gravityMagnitude: 9.81 })).toEqual([0, 9.81, 0])
    expect(gravityVector({ gravityMode: 'zero', gravityMagnitude: 9.81 })).toEqual([0, 0, 0])
  })
  it('transitions between modes', () => {
    setGravityMode('reverse'); expect(getState().gravityMode).toBe('reverse')
    setGravityMode('zero'); expect(getState().gravityMode).toBe('zero')
    setGravityMode('normal'); expect(getState().gravityMode).toBe('normal')
  })
})

describe('objects', () => {
  it('starts with 6 objects', () => expect(getState().objects).toHaveLength(6))
  it('enforces the object cap', () => {
    while (spawn('cube')) { /* fill */ }
    expect(getState().objects).toHaveLength(MAX_OBJECTS)
    expect(spawn('sphere')).toBe(false)
    expect(getState().objects).toHaveLength(MAX_OBJECTS)
  })
  it('clear removes everything and deselects', () => {
    select(getState().objects[0].id)
    clearObjects()
    expect(getState().objects).toHaveLength(0)
    expect(getState().selectedId).toBeNull()
  })
  it('selectNext cycles and wraps', () => {
    const ids = getState().objects.map((o) => o.id)
    selectNext(1); expect(getState().selectedId).toBe(ids[0])
    selectNext(-1); expect(getState().selectedId).toBe(ids[ids.length - 1])
    selectNext(1); expect(getState().selectedId).toBe(ids[0])
  })
})

describe('reset', () => {
  it('restores defaults', () => {
    setGravityMode('reverse'); setPaused(true); setBouncy(true); spawn('cube'); spawn('cube')
    resetUniverse()
    const s = getState()
    expect(s.gravityMode).toBe('normal')
    expect(s.gravityMagnitude).toBe(9.81)
    expect(s.paused).toBe(false)
    expect(s.bouncy).toBe(false)
    expect(s.objects).toHaveLength(6)
    expect(s.selectedId).toBeNull()
  })
})
