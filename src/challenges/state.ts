import type { ChallengeDef } from './defs'

export interface ChallengeState {
  id: string
  status: 'playing' | 'complete'
  progress: number
  target: number
  /** True once a collision rule has fired in this attempt (needed by Quantum Launch). */
  fired: boolean
}
export type ChallengeEvent = { type: 'goal'; tag?: string; id?: number } | { type: 'spawn' } | { type: 'fired' }

export const initialChallengeState = (def: ChallengeDef): ChallengeState => ({
  id: def.id,
  status: 'playing',
  progress: 0,
  target: def.win.type === 'spawns' ? def.win.count : 1,
  fired: false,
})

/** Pure reducer. Returns the same object when nothing changes. Completed challenges ignore all events. */
export function reduceChallenge(s: ChallengeState, def: ChallengeDef, ev: ChallengeEvent): ChallengeState {
  if (s.status === 'complete' || s.id !== def.id) return s
  const w = def.win
  switch (ev.type) {
    case 'fired':
      return s.fired ? s : { ...s, fired: true }
    case 'spawn': {
      if (w.type !== 'spawns') return s
      const progress = Math.min(s.target, s.progress + 1)
      return { ...s, progress, status: progress >= s.target ? 'complete' : 'playing' }
    }
    case 'goal': {
      if (w.type !== 'deliver' || ev.tag !== w.tag) return s // unrelated objects are ignored
      if (w.requireFired && !s.fired) return s
      return { ...s, progress: 1, status: 'complete' }
    }
  }
}
