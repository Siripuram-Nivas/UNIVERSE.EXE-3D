import { describeRule } from './describe'
import {
  BURST_COLORS, GRAVITY_MODES, HIT_KINDS, LIMITS, OBJ_KINDS,
  type Effect, type RuleDraft, type Trigger,
} from './types'

export type Validation =
  | { ok: true; draft: RuleDraft; notes: string[] }
  | { ok: false; errors: string[] }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v)

function num(
  v: unknown, range: { min: number; max: number }, fallback: number | undefined, label: string,
  errors: string[], notes: string[],
): number | undefined {
  if (v === undefined || v === null) return fallback
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    errors.push(`${label} must be a finite number.`)
    return fallback
  }
  const c = Math.min(range.max, Math.max(range.min, v))
  if (c !== v) notes.push(`${label} clamped to ${c}.`)
  return c
}

/** Validates untrusted input (AI output, builder form) against the allowlisted schema. Never throws. */
export function validateRule(input: unknown): Validation {
  const errors: string[] = []
  const notes: string[] = []
  if (!isObj(input)) return { ok: false, errors: ['Rule must be an object.'] }

  // trigger
  let trigger: Trigger | undefined
  const t = input.trigger
  if (!isObj(t)) errors.push('Missing trigger.')
  else if (t.type === 'activation') trigger = { type: 'activation' }
  else if (t.type === 'collision') {
    if (!oneOf(OBJ_KINDS, t.a)) errors.push(`Unsupported collision object "${String(t.a)}". Supported: ${OBJ_KINDS.join(', ')}.`)
    else if (!oneOf(HIT_KINDS, t.b)) errors.push(`Unsupported collision partner "${String(t.b)}". Supported: ${HIT_KINDS.join(', ')}.`)
    else trigger = { type: 'collision', a: t.a, b: t.b }
  } else errors.push(`Unsupported trigger "${String((t as Record<string, unknown>).type)}". Supported: collision, activation.`)

  // effect
  let effect: Effect | undefined
  const e = input.effect
  if (!isObj(e)) errors.push('Missing effect.')
  else {
    switch (e.type) {
      case 'spawn':
        if (!oneOf(OBJ_KINDS, e.kind)) errors.push(`Cannot spawn "${String(e.kind)}". Supported: ${OBJ_KINDS.join(', ')}.`)
        else if (e.at !== undefined && e.at !== 'collision' && e.at !== 'above_center') errors.push('Spawn position must be "collision" or "above_center".')
        else effect = { type: 'spawn', kind: e.kind, at: e.at === 'above_center' ? 'above_center' : 'collision' }
        break
      case 'impulse': {
        const target = e.target === undefined ? 'a' : e.target
        const direction = e.direction === undefined ? 'up' : e.direction
        const strength = num(e.strength, LIMITS.strength, LIMITS.strength.default, 'Impulse strength', errors, notes)
        if (target !== 'a' && target !== 'b' && target !== 'both') errors.push('Impulse target must be a, b or both.')
        else if (direction !== 'up' && direction !== 'down' && direction !== 'away') errors.push('Impulse direction must be up, down or away.')
        else if (strength !== undefined) effect = { type: 'impulse', target, direction, strength }
        break
      }
      case 'gravity':
        if (!oneOf(GRAVITY_MODES, e.mode)) errors.push(`Unsupported gravity mode "${String(e.mode)}". Supported: ${GRAVITY_MODES.join(', ')}.`)
        else effect = { type: 'gravity', mode: e.mode }
        break
      case 'bounciness':
        if (typeof e.bouncy !== 'boolean') errors.push('Bounciness effect needs bouncy: true or false.')
        else effect = { type: 'bounciness', bouncy: e.bouncy }
        break
      case 'burst':
        if (!oneOf(BURST_COLORS, e.color)) errors.push(`Unsupported burst color "${String(e.color)}". Supported: ${BURST_COLORS.join(', ')}.`)
        else effect = { type: 'burst', color: e.color }
        break
      default:
        errors.push(`Unsupported effect "${String(e.type)}". Supported: spawn, impulse, gravity, bounciness, burst.`)
    }
  }

  // cross-field constraints
  if (trigger && effect) {
    if (trigger.type === 'activation') {
      if (effect.type === 'spawn' && effect.at === 'collision') errors.push('"Spawn at collision" needs a collision trigger.')
      if (effect.type === 'impulse' && effect.direction === 'away') errors.push('"Away" impulses need a collision trigger.')
      if (effect.type === 'impulse') effect = { ...effect, target: 'both' } // activation pushes every object
    } else if (effect.type === 'impulse' && trigger.b === 'floor' && effect.target !== 'a') {
      errors.push('The floor cannot be pushed; target the first object (a).')
    }
  }

  const cooldownS = num(input.cooldownS, LIMITS.cooldownS, LIMITS.cooldownS.default, 'Cooldown', errors, notes) ?? LIMITS.cooldownS.default
  let durationS = num(input.durationS, LIMITS.durationS, undefined, 'Duration', errors, notes)
  if (durationS !== undefined && effect && effect.type !== 'gravity' && effect.type !== 'bounciness') {
    notes.push('Duration ignored: only gravity and bounciness effects can be time-limited.')
    durationS = undefined
  }

  if (errors.length || !trigger || !effect) return { ok: false, errors: errors.length ? errors : ['Invalid rule.'] }

  const base: RuleDraft = { name: '', trigger, effect, cooldownS, ...(durationS !== undefined ? { durationS } : {}) }
  const raw = typeof input.name === 'string' ? input.name.replace(/[\u0000-\u001f<>]/g, '').trim() : ''
  base.name = (raw || describeRule(base)).slice(0, LIMITS.nameLength)
  return { ok: true, draft: base, notes }
}
