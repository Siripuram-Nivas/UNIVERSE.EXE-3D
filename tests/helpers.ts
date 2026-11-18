import { RealityEngine, type BodyInfo, type Host } from '../src/reality/engine'
import type { ObjKind, RGravityMode, Rule, RuleDraft } from '../src/reality/types'
import { PRESETS } from '../src/reality/presets'

export function makeHost() {
  const s = {
    rules: [] as Rule[], paused: false, bodies: new Map<number, BodyInfo>(), nextId: 100, cap: 60,
    gravity: 'normal' as RGravityMode, bouncy: false,
    impulses: [] as { id: number; v: [number, number, number] }[],
    spawned: [] as { kind: ObjKind; pos: number[]; gen: number; id: number }[],
    bursts: [] as string[], logs: [] as { text: string; ok: boolean }[],
  }
  const host: Host = {
    rules: () => s.rules,
    paused: () => s.paused,
    getBody: (id) => s.bodies.get(id) ?? null,
    spawn(kind, pos, gen) {
      if (s.bodies.size >= s.cap) return null
      const id = s.nextId++
      s.bodies.set(id, { kind, pos, gen })
      s.spawned.push({ kind, pos, gen, id })
      return id
    },
    impulse(id, v) { if (!s.bodies.has(id)) return false; s.impulses.push({ id, v }); return true },
    allIds: () => [...s.bodies.keys()],
    getGravity: () => s.gravity,
    setGravity: (m) => { s.gravity = m },
    getBouncy: () => s.bouncy,
    setBouncy: (b) => { s.bouncy = b },
    burst: (c) => { s.bursts.push(c) },
    log: (text, ok) => { s.logs.push({ text, ok }) },
  }
  const engine = new RealityEngine(host)
  const body = (id: number, kind: ObjKind, gen = 0, pos: [number, number, number] = [0, 2, 0]) => { s.bodies.set(id, { kind, pos, gen }) }
  const add = (draft: RuleDraft, id = `r${s.rules.length + 1}`): Rule => {
    const r: Rule = { ...draft, id, enabled: true }
    s.rules.push(r)
    return r
  }
  const preset = (presetId: string) => PRESETS.find((p) => p.presetId === presetId)!.draft
  const step = (seconds: number, dt = 1 / 60) => { for (let t = 0; t < seconds; t += dt) engine.advance(dt) }
  return { s, host, engine, body, add, preset, step }
}
