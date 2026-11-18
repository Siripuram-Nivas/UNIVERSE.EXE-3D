import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClapDetector } from '../src/controls/clap'
import { clapAction, startMic, stopMic, type MicEnv } from '../src/controls/mic'
import { getState, resetUniverse, setMic } from '../src/store'

/** Feeds a level pattern at 25 ms per sample. */
function run(det: ClapDetector, levels: number[], start = 0) {
  let claps = 0
  levels.forEach((l, i) => { if (det.feed(l, start + i * 25)) claps++ })
  return claps
}
const quiet = (n: number) => Array(n).fill(0.01)

describe('clap detector (heuristic)', () => {
  it('detects a short loud transient', () => {
    expect(run(new ClapDetector({ sensitivity: () => 5 }), [...quiet(40), 0.6, 0.5, ...quiet(10)])).toBe(1)
  })
  it('ignores steady background noise and sustained loud sounds', () => {
    expect(run(new ClapDetector({ sensitivity: () => 5 }), quiet(200))).toBe(0)
    expect(run(new ClapDetector({ sensitivity: () => 5 }), [...quiet(40), ...Array(30).fill(0.6), ...quiet(10)])).toBe(0)
  })
  it('applies a cooldown between claps', () => {
    const d = new ClapDetector({ sensitivity: () => 5, cooldownMs: 900 })
    expect(run(d, [...quiet(40), 0.6, ...quiet(5), 0.6, ...quiet(5)])).toBe(1) // second clap ~150 ms later
    expect(run(d, [...quiet(60), 0.6, ...quiet(5)], 10_000)).toBe(1)
  })
  it('higher sensitivity catches quieter claps', () => {
    const soft = [...quiet(40), 0.12, ...quiet(10)]
    expect(run(new ClapDetector({ sensitivity: () => 1 }), soft)).toBe(0)
    expect(run(new ClapDetector({ sensitivity: () => 10 }), soft)).toBe(1)
  })
  it('does not crash on NaN input', () => {
    expect(new ClapDetector({ sensitivity: () => 5 }).feed(NaN, 0)).toBe(false)
  })
})

function fakeEnv(opts: { fail?: string } = {}) {
  const track = { stop: vi.fn() }
  const ctx = { close: vi.fn().mockResolvedValue(undefined), createAnalyser: () => ({ fftSize: 0, getFloatTimeDomainData: (b: Float32Array) => b.fill(0) }), createMediaStreamSource: () => ({ connect: vi.fn() }) }
  let tick: (() => void) | null = null
  const env: MicEnv = {
    getUserMedia: opts.fail ? () => Promise.reject(Object.assign(new Error(opts.fail), { name: opts.fail })) : () => Promise.resolve({ getTracks: () => [track] } as unknown as MediaStream),
    createContext: () => ctx as unknown as AudioContext,
    now: () => 0,
    setInterval: (fn) => { tick = fn; return 7 },
    clearInterval: vi.fn(),
  }
  return { env, track, ctx, tick: () => tick?.() }
}

describe('microphone control', () => {
  beforeEach(() => { resetUniverse(); setMic('off') })
  afterEach(() => stopMic())

  it('is off by default and never asks for permission on its own', () => {
    expect(getState().micStatus).toBe('off')
  })
  it('reports unavailable when the browser has no microphone API', async () => {
    await startMic({})
    expect(getState().micStatus).toBe('unavailable')
  })
  it('handles denied permission without leaving resources open', async () => {
    const f = fakeEnv({ fail: 'NotAllowedError' })
    await startMic(f.env)
    expect(getState().micStatus).toBe('denied')
    expect(f.track.stop).not.toHaveBeenCalled()
  })
  it('handles missing hardware', async () => {
    await startMic(fakeEnv({ fail: 'NotFoundError' }).env)
    expect(getState().micStatus).toBe('unavailable')
  })
  it('starts listening and fully releases stream, timer and audio context on stop', async () => {
    const f = fakeEnv()
    await startMic(f.env)
    expect(getState().micStatus).toBe('on')
    f.tick() // silence: no clap, no crash
    stopMic()
    expect(f.track.stop).toHaveBeenCalledTimes(1)
    expect(f.env.clearInterval).toHaveBeenCalledWith(7)
    expect(f.ctx.close).toHaveBeenCalledTimes(1)
    expect(getState().micStatus).toBe('off')
  })
  it('stops the stream if disabled while the permission prompt is open', async () => {
    const f = fakeEnv()
    const p = startMic(f.env)
    stopMic()
    await p
    expect(f.track.stop).toHaveBeenCalledTimes(1)
    expect(getState().micStatus).toBe('off')
  })
  it('a clap flips gravity between normal and reverse, manual control unaffected', () => {
    clapAction(); expect(getState().gravityMode).toBe('reverse')
    clapAction(); expect(getState().gravityMode).toBe('normal')
  })
})
