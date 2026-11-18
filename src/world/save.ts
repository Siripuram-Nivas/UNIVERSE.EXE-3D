import { validateRule } from '../reality/validator'
import { LIMITS, type Rule } from '../reality/types'
import { MAX_OBJECTS, type GravityMode, type SimObject, type WorldState } from '../store'

export const SAVE_VERSION = 1
export const SLOTS = 3
const MAX_SAVE_CHARS = 200_000
const keyOf = (slot: number) => `universe-exe:save:${slot}`

/** On-disk shape. Plain data only: no Rapier handles. Velocities are restored; contact caches and sleep state are not. */
export interface SaveV1 {
  version: 1
  name: string
  savedAt: string
  world: 'chamber-001'
  gravityMode: GravityMode
  gravityMagnitude: number
  bouncy: boolean
  paused: boolean
  objects: SimObject[]
  rules: Rule[]
}

export type SlotRead =
  | { status: 'empty' }
  | { status: 'ok'; save: SaveV1; notes: string[] }
  | { status: 'corrupt'; error: string }

type Result = { ok: true; save: SaveV1; notes: string[] } | { ok: false; error: string }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const fin = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const vec = (v: unknown, n: number, lim: number): number[] | null =>
  Array.isArray(v) && v.length === n && v.every(fin) ? (v as number[]).map((x) => clamp(x, -lim, lim)) : null

export function toSave(w: WorldState, name: string, now = new Date()): SaveV1 {
  return {
    version: SAVE_VERSION, name: name.slice(0, 40), savedAt: now.toISOString(), world: 'chamber-001',
    gravityMode: w.gravityMode, gravityMagnitude: w.gravityMagnitude, bouncy: w.bouncy, paused: w.paused,
    objects: w.objects, rules: w.rules,
  }
}

/** Validates untrusted saved data. Never throws. */
export function validateSave(raw: unknown): Result {
  if (!isObj(raw)) return { ok: false, error: 'Save is not an object.' }
  if (raw.version !== SAVE_VERSION) return { ok: false, error: `Unsupported save version (${String(raw.version)}).` }
  if (!['normal', 'zero', 'reverse'].includes(raw.gravityMode as string)) return { ok: false, error: 'Invalid gravity mode.' }
  if (!fin(raw.gravityMagnitude)) return { ok: false, error: 'Invalid gravity magnitude.' }
  if (typeof raw.bouncy !== 'boolean') return { ok: false, error: 'Invalid bounciness flag.' }
  if (!Array.isArray(raw.objects)) return { ok: false, error: 'Missing objects.' }
  if (raw.objects.length > MAX_OBJECTS) return { ok: false, error: `Save has ${raw.objects.length} objects; the limit is ${MAX_OBJECTS}.` }

  const notes: string[] = []
  const ids = new Set<number>()
  const objects: SimObject[] = []
  for (const o of raw.objects as unknown[]) {
    if (!isObj(o)) return { ok: false, error: 'Invalid object entry.' }
    if (!Number.isInteger(o.id) || (o.id as number) < 1) return { ok: false, error: 'Invalid object id.' }
    if (ids.has(o.id as number)) return { ok: false, error: `Duplicate object id ${String(o.id)}.` }
    if (o.kind !== 'sphere' && o.kind !== 'cube') return { ok: false, error: `Unsupported object kind "${String(o.kind)}".` }
    const pos = vec(o.pos, 3, 50)
    if (!pos) return { ok: false, error: `Object ${String(o.id)} has an invalid position.` }
    ids.add(o.id as number)
    const obj: SimObject = {
      id: o.id as number, kind: o.kind, heavy: o.heavy === true,
      pos: [clamp(pos[0], -7.5, 7.5), clamp(pos[1], 0.3, 14.5), clamp(pos[2], -7.5, 7.5)],
      gen: Number.isInteger(o.gen) ? clamp(o.gen as number, 0, LIMITS.maxGeneration) : 0,
    }
    if (typeof o.tag === 'string') obj.tag = o.tag.slice(0, 20)
    const q = vec(o.quat, 4, 1.01); if (q) obj.quat = q as SimObject['quat']
    const v = vec(o.vel, 3, 40); if (v) obj.vel = v as SimObject['vel']
    const a = vec(o.angvel, 3, 40); if (a) obj.angvel = a as SimObject['angvel']
    objects.push(obj)
  }

  const rules: Rule[] = []
  const rawRules = Array.isArray(raw.rules) ? raw.rules : []
  for (const r of rawRules.slice(0, LIMITS.maxRules)) {
    const v = isObj(r) ? validateRule(r) : null
    if (!v || !v.ok) { notes.push('A saved rule was invalid and was skipped.'); continue }
    rules.push({
      ...v.draft, id: `loaded-${rules.length}`, enabled: isObj(r) && r.enabled === false ? false : true,
      ...(isObj(r) && typeof r.presetId === 'string' ? { presetId: r.presetId.slice(0, 40) } : {}),
    })
  }
  if (rawRules.length > LIMITS.maxRules) notes.push(`Only the first ${LIMITS.maxRules} rules were loaded.`)

  return {
    ok: true, notes,
    save: {
      version: 1, name: typeof raw.name === 'string' ? raw.name.slice(0, 40) : 'Untitled',
      savedAt: typeof raw.savedAt === 'string' ? raw.savedAt.slice(0, 40) : '', world: 'chamber-001',
      gravityMode: raw.gravityMode as GravityMode, gravityMagnitude: clamp(raw.gravityMagnitude, 1, 30),
      bouncy: raw.bouncy, paused: raw.paused === true, objects, rules,
    },
  }
}

export function saveToWorld(s: SaveV1): WorldState {
  return {
    objects: s.objects, rules: s.rules, gravityMode: s.gravityMode, gravityMagnitude: s.gravityMagnitude,
    bouncy: s.bouncy, paused: s.paused,
  }
}

/* ---- localStorage wrappers (Storage is injected so they can be tested) ---- */
export type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const defaultStore = (): Store | null => { try { return typeof localStorage !== 'undefined' ? localStorage : null } catch { return null } }

export function readSlot(slot: number, store: Store | null = defaultStore()): SlotRead {
  if (!store) return { status: 'corrupt', error: 'Local storage is unavailable.' }
  let text: string | null
  try { text = store.getItem(keyOf(slot)) } catch { return { status: 'corrupt', error: 'Local storage is unavailable.' } }
  if (text === null) return { status: 'empty' }
  if (text.length > MAX_SAVE_CHARS) return { status: 'corrupt', error: 'Save is too large.' }
  let raw: unknown
  try { raw = JSON.parse(text) } catch { return { status: 'corrupt', error: 'Save is not valid JSON.' } }
  const v = validateSave(raw)
  return v.ok ? { status: 'ok', save: v.save, notes: v.notes } : { status: 'corrupt', error: v.error }
}

export function writeSlot(slot: number, save: SaveV1, store: Store | null = defaultStore()): { ok: boolean; error?: string } {
  if (!store) return { ok: false, error: 'Local storage is unavailable.' }
  try { store.setItem(keyOf(slot), JSON.stringify(save)); return { ok: true } } catch { return { ok: false, error: 'Could not write the save (storage full or blocked).' } }
}

export function deleteSlot(slot: number, store: Store | null = defaultStore()): boolean {
  if (!store) return false
  try { store.removeItem(keyOf(slot)); return true } catch { return false }
}
