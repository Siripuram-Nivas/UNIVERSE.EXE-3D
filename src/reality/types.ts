/** Strict, allowlisted rule schema. Every rule (preset, builder, AI proposal) is one of these shapes. */
export const OBJ_KINDS = ['sphere', 'cube'] as const
export type ObjKind = (typeof OBJ_KINDS)[number]
export const HIT_KINDS = ['sphere', 'cube', 'floor'] as const
export type HitKind = (typeof HIT_KINDS)[number]
export const GRAVITY_MODES = ['normal', 'zero', 'reverse'] as const
export type RGravityMode = (typeof GRAVITY_MODES)[number]
export const BURST_COLORS = ['orange', 'yellow', 'purple', 'lime'] as const
export type RBurstColor = (typeof BURST_COLORS)[number]

export type Trigger =
  | { type: 'collision'; a: ObjKind; b: HitKind }
  | { type: 'activation' }

export type Effect =
  | { type: 'spawn'; kind: ObjKind; at: 'collision' | 'above_center' }
  | { type: 'impulse'; target: 'a' | 'b' | 'both'; direction: 'up' | 'down' | 'away'; strength: number }
  | { type: 'gravity'; mode: RGravityMode }
  | { type: 'bounciness'; bouncy: boolean }
  | { type: 'burst'; color: RBurstColor }

/** A validated rule before it receives an id (what the builder and AI both produce). */
export interface RuleDraft {
  name: string
  trigger: Trigger
  effect: Effect
  cooldownS: number
  /** Only for gravity / bounciness: revert after this many simulated seconds. */
  durationS?: number
}

export interface Rule extends RuleDraft {
  id: string
  enabled: boolean
  presetId?: string
}

export const LIMITS = {
  maxRules: 12,
  cooldownS: { min: 0.5, max: 60, default: 1 },
  durationS: { min: 0.5, max: 30 },
  strength: { min: 0.5, max: 30, default: 8 },
  nameLength: 60,
  maxEffectsPerSecond: 6,
  maxQueue: 64,
  maxEventsPerTick: 16,
  dedupeWindowS: 0.15,
  /** Objects created by rules carry gen = parent gen + 1; spawn effects refuse parents at this generation. */
  maxGeneration: 3,
  maxInputChars: 200,
} as const
