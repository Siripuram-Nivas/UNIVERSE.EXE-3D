import { describeEffect } from './describe'
import { LIMITS, type Effect, type HitKind, type ObjKind, type RGravityMode, type Rule } from './types'

export type Vec3 = [number, number, number]
export interface BodyInfo { kind: ObjKind; pos: Vec3; gen: number }

/** Everything the engine needs from the world. The live app and the tests each provide one. */
export interface Host {
  rules(): Rule[]
  paused(): boolean
  /** null if the object no longer exists (deleted / unmounted). */
  getBody(id: number): BodyInfo | null
  spawn(kind: ObjKind, pos: Vec3, gen: number): number | null
  /** Velocity change in m/s; wakes the body. False if the body is gone. */
  impulse(id: number, v: Vec3): boolean
  allIds(): number[]
  getGravity(): RGravityMode
  setGravity(mode: RGravityMode): void
  getBouncy(): boolean
  setBouncy(b: boolean): void
  burst(color: 'orange' | 'yellow' | 'purple' | 'lime'): void
  log(text: string, ok: boolean): void
}

export interface CollisionEvent {
  a: { id: number; kind: ObjKind }
  b: { id: number | null; kind: HitKind }
  pos: Vec3
}

export interface RunResult { ok: boolean; message: string }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const clampPos = (p: Vec3): Vec3 => [clamp(p[0], -6.5, 6.5), clamp(p[1], 1, 13), clamp(p[2], -6.5, 6.5)]

interface Revert { key: 'gravity' | 'bounciness'; at: number; undo: () => void }

/**
 * Deterministic rule executor. Frozen time policy: collision events arriving while frozen are
 * DISCARDED, and the engine clock (cooldowns, durations) does not advance while frozen.
 */
export class RealityEngine {
  private queue: CollisionEvent[] = []
  private seen = new Map<string, number>()
  private lastFired = new Map<string, number>()
  private recent: number[] = []
  private reverts: Revert[] = []
  time = 0
  stats = { queued: 0, dropped: 0, fired: 0, deduped: 0 }

  constructor(private host: Host) {}

  get pending() { return this.queue.length }

  enqueueCollision(ev: CollisionEvent): boolean {
    if (this.host.paused()) { this.stats.dropped++; return false }
    if (!this.host.rules().some((r) => r.enabled && r.trigger.type === 'collision')) return false
    const key = ev.b.id === null ? `${ev.a.id}:${ev.b.kind}` : `${Math.min(ev.a.id, ev.b.id)}:${Math.max(ev.a.id, ev.b.id)}`
    const last = this.seen.get(key)
    if (last !== undefined && this.time - last < LIMITS.dedupeWindowS) { this.stats.deduped++; return false }
    this.seen.set(key, this.time)
    if (this.queue.length >= LIMITS.maxQueue) { this.stats.dropped++; return false }
    this.queue.push(ev)
    this.stats.queued++
    return true
  }

  /** Advance the engine clock (call once per frame with the frame delta) and process pending work. */
  advance(dt: number) {
    if (this.host.paused()) { this.queue = []; return }
    this.time += clamp(dt, 0, 0.1)
    this.runReverts()
    let n = 0
    while (this.queue.length && n++ < LIMITS.maxEventsPerTick) this.process(this.queue.shift()!)
    if (this.seen.size > 256) for (const [k, t] of this.seen) if (this.time - t > 2) this.seen.delete(k)
  }

  /** Execute a rule's effect once (used when an activation rule is switched on or re-run). */
  runActivation(rule: Rule): RunResult {
    if (!rule.enabled) return { ok: false, message: `"${rule.name}" is disabled.` }
    if (rule.trigger.type !== 'activation') return { ok: false, message: `"${rule.name}" is triggered by collisions, not manual activation.` }
    if (this.host.paused()) return { ok: false, message: 'Time is frozen. Resume time, then run the rule.' }
    if (!this.allowEffect()) return { ok: false, message: 'Too many effects right now. Try again in a moment.' }
    const r = this.apply(rule, rule.effect, null)
    if (r.ok) this.lastFired.set(rule.id, this.time)
    return r
  }

  /** Clear queued events, dedupe state, cooldowns and pending reverts (e.g. on universe reset). */
  reset() {
    this.queue = []
    this.seen.clear()
    this.lastFired.clear()
    this.recent = []
    this.reverts = []
  }

  /** Forget cooldown state for a deleted rule. */
  forget(ruleId: string) { this.lastFired.delete(ruleId) }

  private allowEffect(): boolean {
    this.recent = this.recent.filter((t) => this.time - t < 1)
    if (this.recent.length >= LIMITS.maxEffectsPerSecond) { this.stats.dropped++; return false }
    this.recent.push(this.time)
    return true
  }

  private process(ev: CollisionEvent) {
    for (const rule of this.host.rules()) {
      if (!rule.enabled || rule.trigger.type !== 'collision') continue
      const t = rule.trigger
      let a = ev.a
      let b = ev.b
      let match = a.kind === t.a && b.kind === t.b
      if (!match && b.id !== null && b.kind === t.a && a.kind === t.b) {
        match = true
        const swapped = { a: { id: b.id, kind: b.kind as ObjKind }, b: { id: a.id, kind: a.kind as HitKind } }
        a = swapped.a
        b = swapped.b
      }
      if (!match) continue
      const last = this.lastFired.get(rule.id)
      if (last !== undefined && this.time - last < rule.cooldownS) continue
      if (!this.allowEffect()) return
      const res = this.apply(rule, rule.effect, { ...ev, a, b })
      if (res.ok) { this.lastFired.set(rule.id, this.time); this.stats.fired++ }
      this.host.log(res.ok ? `Rule "${rule.name}": ${res.message}` : `Rule "${rule.name}" skipped: ${res.message}`, res.ok)
    }
  }

  private apply(rule: Rule, e: Effect, ev: CollisionEvent | null): RunResult {
    const h = this.host
    switch (e.type) {
      case 'spawn': {
        const gen = ev ? Math.max(h.getBody(ev.a.id)?.gen ?? 0, ev.b.id !== null ? h.getBody(ev.b.id)?.gen ?? 0 : 0) : 0
        if (gen >= LIMITS.maxGeneration) return { ok: false, message: 'chain depth limit reached.' }
        let pos: Vec3
        if (e.at === 'collision' && ev) pos = [ev.pos[0] + (Math.random() - 0.5) * 0.6, ev.pos[1] + 1.4, ev.pos[2] + (Math.random() - 0.5) * 0.6]
        else pos = [(Math.random() - 0.5) * 3, 10, (Math.random() - 0.5) * 3]
        const id = h.spawn(e.kind, clampPos(pos), gen + 1)
        if (id === null) return { ok: false, message: 'object cap reached.' }
        h.burst('yellow')
        return { ok: true, message: `spawned a ${e.kind}.` }
      }
      case 'impulse': {
        const ids: number[] = ev
          ? e.target === 'a' ? [ev.a.id] : e.target === 'b' ? (ev.b.id !== null ? [ev.b.id] : []) : [ev.a.id, ...(ev.b.id !== null ? [ev.b.id] : [])]
          : h.allIds()
        let applied = 0
        for (const id of ids) {
          const me = h.getBody(id)
          if (!me) continue
          let v: Vec3 = [0, e.direction === 'down' ? -e.strength : e.strength, 0]
          if (e.direction === 'away') {
            const otherId = ev && id === ev.a.id ? ev.b.id : ev?.a.id ?? null
            const other = otherId !== null && otherId !== undefined ? h.getBody(otherId) : null
            if (!other) v = [0, e.strength, 0]
            else {
              const d: Vec3 = [me.pos[0] - other.pos[0], me.pos[1] - other.pos[1], me.pos[2] - other.pos[2]]
              const len = Math.hypot(...d) || 1
              v = [(d[0] / len) * e.strength, (d[1] / len) * e.strength, (d[2] / len) * e.strength]
            }
          }
          if (h.impulse(id, v)) applied++
        }
        if (!applied) return { ok: false, message: 'target object no longer exists.' }
        h.burst('orange')
        return { ok: true, message: `${describeEffect(e)}.` }
      }
      case 'gravity': {
        const prev = h.getGravity()
        if (prev === e.mode) return { ok: false, message: `gravity is already ${e.mode}.` }
        h.setGravity(e.mode)
        this.scheduleRevert('gravity', rule.durationS, () => h.setGravity(prev))
        return { ok: true, message: `gravity set to ${e.mode}${rule.durationS ? ` for ${rule.durationS}s` : ''}.` }
      }
      case 'bounciness': {
        const prev = h.getBouncy()
        if (prev === e.bouncy) return { ok: false, message: `bounciness is already ${e.bouncy ? 'on' : 'off'}.` }
        h.setBouncy(e.bouncy)
        this.scheduleRevert('bounciness', rule.durationS, () => h.setBouncy(prev))
        return { ok: true, message: e.bouncy ? 'everything is bouncy.' : 'bounce restored to normal.' }
      }
      case 'burst':
        h.burst(e.color)
        return { ok: true, message: `${e.color} energy burst.` }
    }
  }

  private scheduleRevert(key: Revert['key'], durationS: number | undefined, undo: () => void) {
    if (!durationS) return
    // A newer effect of the same kind replaces the older timer, keeping the ORIGINAL baseline of the older one.
    const old = this.reverts.find((r) => r.key === key)
    if (old) { old.at = this.time + durationS; return }
    this.reverts.push({ key, at: this.time + durationS, undo })
  }

  private runReverts() {
    if (!this.reverts.length) return
    const due = this.reverts.filter((r) => r.at <= this.time)
    if (!due.length) return
    this.reverts = this.reverts.filter((r) => r.at > this.time)
    for (const r of due) r.undo()
  }
}
