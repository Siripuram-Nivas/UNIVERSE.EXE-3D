import { useSyncExternalStore } from 'react'

export type Kind = 'sphere' | 'cube'
export type GravityMode = 'normal' | 'zero' | 'reverse'
export interface SimObject {
  id: number
  kind: Kind
  heavy: boolean
  pos: [number, number, number]
}
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
}

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
  if (state.objects.length >= MAX_OBJECTS) return false
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
  })
  fireBurst('orange')
}
