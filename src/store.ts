import { useSyncExternalStore } from 'react'
import { getChallenge } from './challenges/defs'
import { reduceChallenge, type ChallengeEvent, type ChallengeState } from './challenges/state'
import { emitSparks } from './effects'
import { LIMITS, type Rule, type RuleDraft } from './reality/types'

export type Kind = 'sphere' | 'cube'
export type GravityMode = 'normal' | 'zero' | 'reverse'
export interface SimObject {
  id: number
  kind: Kind
  heavy: boolean
  pos: [number, number, number]
  /** 0 for user-spawned objects; rule-spawned objects are parent generation + 1. */
  gen?: number
  /** Challenge marker, e.g. the sphere that must reach the goal. */
  tag?: string
  /** Restored physical state (saves, sandbox restore). */
  quat?: [number, number, number, number]
  vel?: [number, number, number]
  angvel?: [number, number, number]
}

/** Everything that defines the simulated world (what saves and the sandbox stash contain). */
export interface WorldState {
  objects: SimObject[]
  rules: Rule[]
  gravityMode: GravityMode
  gravityMagnitude: number
  bouncy: boolean
  paused: boolean
}
export type Mode = 'sandbox' | 'challenges'
export type MicStatus = 'off' | 'requesting' | 'on' | 'denied' | 'unavailable'
export interface Proposal {
  input: string
  draft: RuleDraft
  notes: string[]
}
export type AiStatus = 'unknown' | 'ready' | 'unavailable'
export type BurstColor = 'orange' | 'yellow' | 'purple' | 'lime'
export interface Feedback {
  id: number
  ok: boolean
  text: string
}

export const MAX_OBJECTS = 60
export const WORLD_NAME = 'CHAMBER 001 — THE PARADOX CORE'
export const BURST_HEX: Record<BurstColor, string> = {
  orange: '#FF5A1F',
  yellow: '#FFD83D',
  purple: '#A259FF',
  lime: '#B7FF2A',
}

interface State {
  ready: boolean
  gravityMode: GravityMode
  gravityMagnitude: number
  paused: boolean
  bouncy: boolean
  lowQuality: boolean
  objects: SimObject[]
  selectedId: number | null
  burst: { id: number; color: BurstColor }
  feedback: Feedback
  rules: Rule[]
  proposal: Proposal | null
  compiling: boolean
  aiStatus: AiStatus
  /** Bumped by resetUniverse so the engine can clear queued events and timers. */
  resetCount: number
  mode: Mode
  challenge: ChallengeState | null
  /** Sandbox world captured when a challenge starts; restored on exit. */
  stash: WorldState | null
  /** Bumped whenever the whole world is replaced so 3D bodies are rebuilt. */
  epoch: number
  micStatus: MicStatus
  micSensitivity: number
  /** Ids of solved challenges (persisted in localStorage). */
  completed: string[]
}

const PROGRESS_KEY = 'universe-exe:progress'
function loadCompleted(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!getChallenge(x)) : []
  } catch {
    return []
  }
}

let nextRuleId = 1
let nextId = 1
let nextEvent = 1

function initialObjects(): SimObject[] {
  const list: SimObject[] = []
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    list.push({
      id: nextId++,
      kind: i % 2 ? 'cube' : 'sphere',
      heavy: i === 3,
      pos: [Math.cos(a) * 3.6, 6 + (i % 3) * 1.8, Math.sin(a) * 3.6],
    })
  }
  return list
}

let state: State = {
  ready: false,
  gravityMode: 'normal',
  gravityMagnitude: 9.81,
  paused: false,
  bouncy: false,
  lowQuality: false,
  objects: initialObjects(),
  selectedId: null,
  burst: { id: 0, color: 'purple' },
  feedback: { id: 0, ok: true, text: 'Chamber online. Type a command or use the panels.' },
  rules: [],
  proposal: null,
  compiling: false,
  aiStatus: 'unknown',
  resetCount: 0,
  mode: 'sandbox',
  challenge: null,
  stash: null,
  epoch: 0,
  micStatus: 'off',
  micSensitivity: 5,
  completed: loadCompleted(),
}

const listeners = new Set<() => void>()
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const getState = () => state
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}

export function gravityVector(s: Pick<State, 'gravityMode' | 'gravityMagnitude'>): [number, number, number] {
  if (s.gravityMode === 'zero') return [0, 0, 0]
  return [0, s.gravityMode === 'reverse' ? s.gravityMagnitude : -s.gravityMagnitude, 0]
}

/* ---------- actions ---------- */
export const setReady = () => !state.ready && set({ ready: true })
export const say = (text: string, ok = true) => set({ feedback: { id: nextEvent++, ok, text } })
export const fireBurst = (color: BurstColor) => set({ burst: { id: nextEvent++, color } })
export const select = (id: number | null) => set({ selectedId: id })
export function selectNext(dir: 1 | -1) {
  const list = state.objects
  if (!list.length) return
  const i = list.findIndex((o) => o.id === state.selectedId)
  const n = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length
  set({ selectedId: list[n].id })
}

export function setGravityMode(mode: GravityMode) {
  set({ gravityMode: mode })
  fireBurst(mode === 'reverse' ? 'orange' : mode === 'zero' ? 'purple' : 'lime')
}
export const toggleQuality = () => set({ lowQuality: !state.lowQuality })
export const setGravityMagnitude = (v: number) => set({ gravityMagnitude: v })
export function setPaused(paused: boolean) {
  set({ paused })
  fireBurst(paused ? 'purple' : 'lime')
}
export function setBouncy(bouncy: boolean) {
  set({ bouncy })
  fireBurst(bouncy ? 'yellow' : 'purple')
}

export function spawn(kind: Kind, heavy = false): boolean {
  if (state.challenge || state.objects.length >= MAX_OBJECTS) return false
  const a = Math.random() * Math.PI * 2
  const r = 2.8 + Math.random() * 3
  const obj: SimObject = {
    id: nextId++,
    kind,
    heavy,
    pos: [Math.cos(a) * r, 7 + Math.random() * 4, Math.sin(a) * r],
  }
  set({ objects: [...state.objects, obj], selectedId: obj.id })
  return true
}

export function clearObjects() {
  set({ objects: [], selectedId: null })
  fireBurst('purple')
}

export function resetUniverse() {
  set({
    gravityMode: 'normal',
    gravityMagnitude: 9.81,
    paused: false,
    bouncy: false,
    objects: initialObjects(),
    selectedId: null,
    rules: [],
    proposal: null,
    resetCount: state.resetCount + 1,
    mode: 'sandbox',
    challenge: null,
    stash: null,
    epoch: state.epoch + 1,
  })
  fireBurst('orange')
}

/** Spawn without selecting (used by rules). Returns the new id, or null at the object cap. */
export function spawnAt(kind: Kind, pos: [number, number, number], gen: number): number | null {
  if (state.objects.length >= MAX_OBJECTS) return null
  const obj: SimObject = { id: nextId++, kind, heavy: false, pos, gen }
  set({ objects: [...state.objects, obj] })
  return obj.id
}

/* ---------- reality rules ---------- */
export function addRule(draft: RuleDraft, presetId?: string): Rule | null {
  if (state.rules.length >= LIMITS.maxRules) return null
  const rule: Rule = { ...draft, id: `rule-${nextRuleId++}`, enabled: true, ...(presetId ? { presetId } : {}) }
  set({ rules: [...state.rules, rule] })
  return rule
}
export const toggleRule = (id: string) =>
  set({ rules: state.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)) })
export const removeRule = (id: string) => set({ rules: state.rules.filter((r) => r.id !== id) })
export const clearRules = () => set({ rules: [] })
export const setProposal = (proposal: Proposal | null) => set({ proposal })
export const setCompiling = (compiling: boolean) => set({ compiling })
export const setAiStatus = (aiStatus: AiStatus) => set({ aiStatus })

/* ---------- world replacement, modes, challenges ---------- */
/** Replaces the entire simulated world. Re-ids rules and keeps object ids unique. */
export function replaceWorld(w: WorldState, extra: Partial<State> = {}) {
  for (const o of w.objects) nextId = Math.max(nextId, o.id + 1)
  const rules = w.rules.map((r) => ({ ...r, id: `rule-${nextRuleId++}` }))
  set({
    ...w,
    rules,
    selectedId: null,
    proposal: null,
    resetCount: state.resetCount + 1,
    epoch: state.epoch + 1,
    ...extra,
  })
}
export const setMode = (mode: Mode) => set({ mode })
export const setMic = (micStatus: MicStatus) => set({ micStatus })
export const setMicSensitivity = (micSensitivity: number) => set({ micSensitivity })
export const allocateId = () => nextId++

/** Feeds a gameplay event to the active challenge. Returns true if it just completed. */
export function challengeEvent(ev: ChallengeEvent): boolean {
  const cur = state.challenge
  if (!cur) return false
  const def = getChallenge(cur.id)
  if (!def) return false
  const next = reduceChallenge(cur, def, ev)
  if (next === cur) return false
  set({ challenge: next })
  if (next.status === 'complete') {
    if (!state.completed.includes(def.id)) {
      const completed = [...state.completed, def.id]
      set({ completed })
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(completed)) } catch { /* storage unavailable */ }
    }
    fireBurst('lime')
    emitSparks(def.goal?.pos ?? [0, 3, 0], 'lime', 48)
    say(`${def.title} solved!`)
    return true
  }
  return false
}
