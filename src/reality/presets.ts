import type { RuleDraft } from './types'

export interface Preset {
  presetId: string
  label: string
  blurb: string
  draft: RuleDraft
}

export const PRESETS: Preset[] = [
  {
    presetId: 'chain-reaction',
    label: 'Recipe 01 — Chain Reaction',
    blurb: 'Two spheres collide, another sphere appears nearby.',
    draft: {
      name: 'Chain Reaction',
      trigger: { type: 'collision', a: 'sphere', b: 'sphere' },
      effect: { type: 'spawn', kind: 'sphere', at: 'collision' },
      cooldownS: 1.5,
    },
  },
  {
    presetId: 'quantum-kick',
    label: 'Recipe 02 — Quantum Kick',
    blurb: 'A sphere hits a cube and is launched upward.',
    draft: {
      name: 'Quantum Kick',
      trigger: { type: 'collision', a: 'sphere', b: 'cube' },
      effect: { type: 'impulse', target: 'a', direction: 'up', strength: 12 },
      cooldownS: 1,
    },
  },
  {
    presetId: 'gravity-glitch',
    label: 'Recipe 03 — Gravity Glitch',
    blurb: 'A cube hits the floor and gravity reverses for 3 s.',
    draft: {
      name: 'Gravity Glitch',
      trigger: { type: 'collision', a: 'cube', b: 'floor' },
      effect: { type: 'gravity', mode: 'reverse' },
      cooldownS: 6,
      durationS: 3,
    },
  },
]
