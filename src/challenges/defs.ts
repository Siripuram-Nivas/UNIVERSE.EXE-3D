import type { PushKind } from '../physicsRegistry'

type V3 = [number, number, number]
export interface ChallengeObject { kind: 'sphere' | 'cube'; heavy?: boolean; pos: V3; vel?: V3; tag?: string }
export interface Block { pos: V3; size: V3 }
export type WinCondition =
  | { type: 'deliver'; tag: string; requireFired?: boolean }
  | { type: 'spawns'; count: number }

export interface ChallengeDef {
  id: string
  title: string
  objective: string
  hint: string
  objects: ChallengeObject[]
  blocks: Block[]
  goal?: { pos: V3; radius: number }
  /** Preset recipes that are switched on for the level (the player cannot edit rules during a challenge). */
  presets: string[]
  /** Push actions disabled so the intended mechanic must be used. */
  blockedPush: PushKind[]
  /** Overrides the cooldown (s) of the level's preset rules. */
  ruleCooldownS?: number
  win: WinCondition
}

export const CHALLENGES: ChallengeDef[] = [
  {
    id: 'gravity-escape',
    title: 'Gravity Escape',
    objective: 'Get the glowing sphere into the energy ring above the shelf.',
    hint: 'The sphere rolls under the shelf. When it is under the open gap, reverse gravity. Freeze time to line it up.',
    objects: [
      { kind: 'sphere', pos: [-4, 0.45, 0], vel: [1.5, 0, 0], tag: 'target' },
      { kind: 'cube', pos: [-6, 0.35, -3] },
    ],
    blocks: [
      { pos: [-3.5, 4.5, 0], size: [9, 0.4, 16] },
      { pos: [6.6, 6.5, 0], size: [1.4, 1.4, 6] },
    ],
    goal: { pos: [3.8, 9.5, 0], radius: 1.8 },
    presets: [],
    blockedPush: ['launch', 'throw'],
    win: { type: 'deliver', tag: 'target' },
  },
  {
    id: 'chain-reaction',
    title: 'Chain Reaction',
    objective: 'Make the Chain Reaction rule spawn 3 new spheres.',
    hint: 'Select the lone sphere and nudge it into the cluster. Only spheres created by the rule count.',
    objects: [
      { kind: 'sphere', pos: [-4, 0.45, 0], tag: 'pusher' },
      ...([[0, 0], [0.95, 0], [-0.95, 0], [0, 0.95], [0, -0.95], [0.95, 0.95], [-0.95, -0.95], [0.95, -0.95], [-0.95, 0.95]] as const).map(
        ([x, z]) => ({ kind: 'sphere' as const, pos: [x, 0.45, z] as [number, number, number] }),
      ),
    ],
    blocks: [],
    presets: ['chain-reaction'],
    ruleCooldownS: 0.8,
    blockedPush: [],
    win: { type: 'spawns', count: 3 },
  },
  {
    id: 'quantum-launch',
    title: 'Quantum Launch',
    objective: 'Use Quantum Kick to launch the sphere into the energy ring.',
    hint: 'Nudge the sphere toward the heavy cube (+X). The kick fires on impact and sends it upward.',
    objects: [
      { kind: 'sphere', pos: [-3.5, 0.45, 0], tag: 'target' },
      { kind: 'cube', heavy: true, pos: [2.5, 0.45, 0] },
    ],
    blocks: [{ pos: [-4.5, 6.8, 0], size: [7, 0.4, 16] }],
    goal: { pos: [1.4, 7.5, 0], radius: 1.8 },
    presets: ['quantum-kick'],
    blockedPush: ['launch', 'throw'],
    win: { type: 'deliver', tag: 'target', requireFired: true },
  },
]

export const getChallenge = (id: string) => CHALLENGES.find((c) => c.id === id)
