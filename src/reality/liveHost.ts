import { bodies } from '../physicsRegistry'
import {
  addRule, fireBurst, getState, removeRule as storeRemove, say, setBouncy, setGravityMode, spawnAt,
} from '../store'
import { RealityEngine, type Host, type RunResult } from './engine'
import { validateRule } from './validator'
import { LIMITS, type Rule } from './types'

const liveHost: Host = {
  rules: () => getState().rules,
  paused: () => getState().paused,
  getBody(id) {
    const o = getState().objects.find((x) => x.id === id)
    const b = bodies.get(id)
    if (!o || !b) return null
    const p = b.translation()
    return { kind: o.kind, pos: [p.x, p.y, p.z], gen: o.gen ?? 0 }
  },
  spawn: (kind, pos, gen) => spawnAt(kind, pos, gen),
  impulse(id, v) {
    const b = bodies.get(id)
    if (!b) return false
    const m = b.mass()
    b.wakeUp()
    b.applyImpulse({ x: v[0] * m, y: v[1] * m, z: v[2] * m }, true)
    return true
  },
  allIds: () => getState().objects.map((o) => o.id),
  getGravity: () => getState().gravityMode,
  setGravity: setGravityMode,
  getBouncy: () => getState().bouncy,
  setBouncy,
  burst: fireBurst,
  log: (text, ok) => say(text, ok),
}

export const engine = new RealityEngine(liveHost)

/** The single path for adding a rule: builder, presets and confirmed AI proposals all come through here. */
export function activateDraft(input: unknown, presetId?: string): RunResult & { rule?: Rule } {
  const v = validateRule(input)
  if (!v.ok) return { ok: false, message: `Invalid rule: ${v.errors.join(' ')}` }
  if (presetId && getState().rules.some((r) => r.presetId === presetId)) {
    return { ok: false, message: 'That recipe is already in the list.' }
  }
  const rule = addRule(v.draft, presetId)
  if (!rule) return { ok: false, message: `Rule limit reached (${LIMITS.maxRules}). Delete a rule first.` }
  fireBurst('lime')
  if (rule.trigger.type === 'activation') {
    const r = engine.runActivation(rule)
    return { ok: true, rule, message: r.ok ? `Rule "${rule.name}" activated: ${r.message}` : `Rule "${rule.name}" added. ${r.message}` }
  }
  return { ok: true, rule, message: `Rule "${rule.name}" is live. It fires on matching collisions.` }
}

export function deleteRule(id: string) {
  engine.forget(id)
  storeRemove(id)
}
