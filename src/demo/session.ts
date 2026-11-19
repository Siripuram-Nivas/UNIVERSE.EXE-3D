import { emitSparks } from '../effects'
import { activateDraft } from '../reality/liveHost'
import { fireBurst, getState, replaceWorld, say, setPaused, setSession, type WorldState } from '../store'
import { captureWorld } from '../world/snapshot'
import { BREAK_RULE, breakRealityWorld } from './world'

/** Loads the guided experiment. The user's sandbox is stashed once and restored by exitChallenge(). */
export function enterBreak() {
  const s = getState()
  const stash = s.stash ?? captureWorld()
  replaceWorld(breakRealityWorld(), { mode: 'sandbox', challenge: null, stash, session: { type: 'break', phase: 'ready' } })
  fireBurst('purple')
  say('Press BREAK REALITY.')
}

export function replayBreak() {
  const s = getState()
  if (s.session?.type !== 'break') return
  replaceWorld(breakRealityWorld(), { session: { type: 'break', phase: 'ready' } })
  fireBurst('purple')
  say('Experiment reset. Press BREAK REALITY.')
}

/**
 * Adds the Reality Break rule through the normal validated path and runs it. Gravity really flips (Rapier world gravity),
 * reverts after 2.5 s on the engine clock, and the burst/sparks fire only if the state change succeeded.
 */
export function breakReality(): boolean {
  const s = getState()
  if (s.session?.type !== 'break' || s.session.phase !== 'ready') return false
  if (s.paused) setPaused(false) // the rule cannot run while time is frozen
  const r = activateDraft(BREAK_RULE)
  if (!r.ok || getState().gravityMode !== 'reverse') {
    say(r.ok ? 'Reality did not change. Try Replay.' : r.message, false)
    return false
  }
  setSession({ type: 'break', phase: 'broken' })
  emitSparks([0, 3.2, 0], 'orange', 40)
  say('Gravity reversed for 2.5 s. Watch everything rise, then fall.')
  return true
}

export function enterShared(world: WorldState) {
  const s = getState()
  const stash = s.stash ?? captureWorld()
  replaceWorld(cloneWorld(world), { mode: 'sandbox', challenge: null, stash, session: { type: 'shared', world }, sharedPreview: null })
  fireBurst('purple')
  say('Shared experiment loaded. Replay restarts it; Remix keeps it as your sandbox.')
}

export function replayShared() {
  const s = getState()
  if (s.session?.type !== 'shared') return
  replaceWorld(cloneWorld(s.session.world), { session: s.session })
  fireBurst('orange')
  say('Shared experiment restarted.')
}

/** Keeps the shared world as the user's own editable sandbox (their previous sandbox is discarded). */
export function remixShared() {
  const s = getState()
  if (s.session?.type !== 'shared') return
  replaceWorld(cloneWorld(s.session.world), { mode: 'sandbox', challenge: null, stash: null, session: null })
  fireBurst('lime')
  say('Remixing: this world is now your sandbox.')
}

const cloneWorld = (w: WorldState): WorldState => ({ ...w, objects: w.objects.map((o) => ({ ...o })), rules: w.rules.map((r) => ({ ...r })) })
