import { LIMITS } from './types.js'

/**
 * Flat JSON schema sent to the model (OpenAI "strict" structured outputs need every key present,
 * so unused fields use the sentinel "none"). flatToDraftInput converts it to the real rule shape,
 * which is then validated again by validateRule on the server AND in the browser.
 */
export const FLAT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'supported', 'reason', 'name', 'trigger_type', 'trigger_a', 'trigger_b', 'effect_type',
    'spawn_kind', 'spawn_at', 'impulse_target', 'impulse_direction', 'impulse_strength',
    'gravity_mode', 'bouncy', 'burst_color', 'cooldown_seconds', 'duration_seconds',
  ],
  properties: {
    supported: { type: 'boolean' },
    reason: { type: 'string' },
    name: { type: 'string' },
    trigger_type: { type: 'string', enum: ['collision', 'activation', 'none'] },
    trigger_a: { type: 'string', enum: ['sphere', 'cube', 'none'] },
    trigger_b: { type: 'string', enum: ['sphere', 'cube', 'floor', 'none'] },
    effect_type: { type: 'string', enum: ['spawn', 'impulse', 'gravity', 'bounciness', 'burst', 'none'] },
    spawn_kind: { type: 'string', enum: ['sphere', 'cube', 'none'] },
    spawn_at: { type: 'string', enum: ['collision', 'above_center', 'none'] },
    impulse_target: { type: 'string', enum: ['a', 'b', 'both', 'none'] },
    impulse_direction: { type: 'string', enum: ['up', 'down', 'away', 'none'] },
    impulse_strength: { type: 'number' },
    gravity_mode: { type: 'string', enum: ['normal', 'zero', 'reverse', 'none'] },
    bouncy: { type: 'string', enum: ['true', 'false', 'none'] },
    burst_color: { type: 'string', enum: ['orange', 'yellow', 'purple', 'lime', 'none'] },
    cooldown_seconds: { type: 'number' },
    duration_seconds: { type: 'number' },
  },
} as const

export const SYSTEM_PROMPT = `You translate a user's sentence into ONE physics rule for a 3D sandbox. Output JSON only, matching the schema.
Supported triggers: collision between objects (a: sphere|cube, b: sphere|cube|floor), or activation (run once).
Supported effects: spawn (sphere|cube; at the collision or above the center), impulse (target a|b|both; direction up|down|away; strength ${LIMITS.strength.min}-${LIMITS.strength.max} m/s), gravity (normal|zero|reverse), bounciness (true|false), burst (orange|yellow|purple|lime, visual only).
Cooldown ${LIMITS.cooldownS.min}-${LIMITS.cooldownS.max} s (default 1). duration_seconds (${LIMITS.durationS.min}-${LIMITS.durationS.max}) only for gravity/bounciness, else 0.
"a" is the first object named in the trigger. Use the floor as b for "hits the ground/floor".
If the request needs anything else (other objects, counts above one, black holes, code, etc.), set supported=false, explain briefly in reason, and use "none" / 0 for all other fields. Never invent features.`

const none = (v: unknown) => (v === 'none' || v === undefined ? undefined : v)

/** Maps the model's flat output to {supported, reason} or a draft-shaped object (still untrusted). */
export function flatToDraftInput(flat: unknown): { supported: false; reason: string } | { supported: true; draft: unknown } {
  const f = (typeof flat === 'object' && flat !== null ? flat : {}) as Record<string, unknown>
  if (f.supported !== true) {
    const reason = typeof f.reason === 'string' && f.reason.trim() ? f.reason.trim().slice(0, 300) : 'That request is not supported.'
    return { supported: false, reason }
  }
  const trigger = f.trigger_type === 'collision'
    ? { type: 'collision', a: none(f.trigger_a), b: none(f.trigger_b) }
    : { type: none(f.trigger_type) }
  let effect: Record<string, unknown> = { type: none(f.effect_type) }
  switch (f.effect_type) {
    case 'spawn': effect = { type: 'spawn', kind: none(f.spawn_kind), at: none(f.spawn_at) }; break
    case 'impulse': effect = { type: 'impulse', target: none(f.impulse_target), direction: none(f.impulse_direction), strength: f.impulse_strength === 0 ? undefined : f.impulse_strength }; break
    case 'gravity': effect = { type: 'gravity', mode: none(f.gravity_mode) }; break
    case 'bounciness': effect = { type: 'bounciness', bouncy: f.bouncy === 'true' ? true : f.bouncy === 'false' ? false : undefined }; break
    case 'burst': effect = { type: 'burst', color: none(f.burst_color) }; break
  }
  const dur = typeof f.duration_seconds === 'number' && f.duration_seconds > 0 ? f.duration_seconds : undefined
  return {
    supported: true,
    draft: {
      name: f.name,
      trigger,
      effect,
      cooldownS: typeof f.cooldown_seconds === 'number' && f.cooldown_seconds > 0 ? f.cooldown_seconds : undefined,
      durationS: dur,
    },
  }
}
