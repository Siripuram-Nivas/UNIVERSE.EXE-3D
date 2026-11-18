import { emitSparks } from '../effects'
import { PRESETS } from '../reality/presets'
import type { Rule } from '../reality/types'
import {
  allocateId, fireBurst, getState, replaceWorld, resetUniverse, say, setMode,
  type SimObject, type WorldState,
} from '../store'
import { captureWorld } from '../world/snapshot'
import { getChallenge, type ChallengeDef } from './defs'
import { initialChallengeState } from './state'

function worldFor(def: ChallengeDef): WorldState {
  const objects: SimObject[] = def.objects.map((o) => ({
    id: allocateId(), kind: o.kind, heavy: !!o.heavy, pos: o.pos, gen: 0,
    ...(o.vel ? { vel: o.vel } : {}), ...(o.tag ? { tag: o.tag } : {}),
  }))
  const rules: Rule[] = def.presets.flatMap((pid, i) => {
    const p = PRESETS.find((x) => x.presetId === pid)
    return p ? [{ ...p.draft, ...(def.ruleCooldownS ? { cooldownS: def.ruleCooldownS } : {}), id: `c${i}`, enabled: true, presetId: pid }] : []
  })
  return { objects, rules, gravityMode: 'normal', gravityMagnitude: 9.81, bouncy: false, paused: false }
}

/**
 * Entering a challenge captures the sandbox once (the "stash"), then replaces the world with the level.
 * Exiting restores the stash: positions, rotations, velocities, gravity and rules. Sleep state and contact caches are not restored.
 */
export function enterChallenge(id: string): boolean {
  const def = getChallenge(id)
  if (!def) return false
  const s = getState()
  const stash = s.challenge ? s.stash : captureWorld()
  replaceWorld(worldFor(def), { mode: 'challenges', challenge: initialChallengeState(def), stash })
  fireBurst('purple')
  if (def.goal) emitSparks(def.goal.pos, 'pink', 20)
  say(`${def.title}: ${def.objective}`)
  return true
}

export function restartChallenge(): boolean {
  const c = getState().challenge
  if (!c) return false
  const def = getChallenge(c.id)
  if (!def) return false
  replaceWorld(worldFor(def), { challenge: initialChallengeState(def) })
  fireBurst('orange')
  say(`${def.title} restarted.`)
  return true
}

export function exitChallenge() {
  const s = getState()
  if (s.stash) {
    replaceWorld(s.stash, { mode: 'sandbox', challenge: null, stash: null })
    fireBurst('purple')
    say('Back in the sandbox. Your world was restored as you left it.')
  } else {
    resetUniverse()
  }
}

export const challengeNote = 'Saving and loading are disabled during a challenge. Exit to the sandbox first.'

export function switchMode(mode: 'sandbox' | 'challenges') {
  if (mode === 'sandbox') {
    if (getState().challenge) exitChallenge()
    else setMode('sandbox')
  } else setMode('challenges')
}

/** Reset button / command: restarts the level during a challenge, otherwise resets the sandbox. */
export function resetWorld() {
  if (getState().challenge) restartChallenge()
  else resetUniverse()
}
