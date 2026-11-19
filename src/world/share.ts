import type { GravityMode, WorldState } from '../store'
import { saveToWorld, validateSave } from './save'

/**
 * "Reality DNA": a world compressed into a URL fragment (#w=...). The fragment is never sent to a server, so this works on any static host.
 * Only object kind/size/position/generation, gravity, bounciness and rules are shared. Ids, velocities, tags and names of the sender are not.
 * Decoding runs the same validation as saves (allowlisted kinds, clamped numbers, validated rules); nothing is ever evaluated.
 */
export const SHARE_LIMITS = { objects: 30, rules: 6, chars: 4000 } as const
const PREFIX = '#w='
const G: Record<GravityMode, string> = { normal: 'n', zero: 'z', reverse: 'r' }
const GINV: Record<string, GravityMode> = { n: 'normal', z: 'zero', r: 'reverse' }

type Result<T> = ({ ok: true } & T) | { ok: false; error: string }

const toB64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
function fromB64(t: string): string {
  const b = atob(t.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(b, (c) => c.charCodeAt(0)))
}
const r2 = (n: number) => Math.round(n * 100) / 100

export function encodeShare(w: WorldState): Result<{ token: string }> {
  if (w.objects.length === 0) return { ok: false, error: 'Nothing to share: the world has no objects.' }
  if (w.objects.length > SHARE_LIMITS.objects) return { ok: false, error: `Too many objects to share (${w.objects.length}; the limit is ${SHARE_LIMITS.objects}). Clear some first.` }
  if (w.rules.length > SHARE_LIMITS.rules) return { ok: false, error: `Too many rules to share (${w.rules.length}; the limit is ${SHARE_LIMITS.rules}).` }
  const payload = {
    v: 1,
    g: G[w.gravityMode],
    m: r2(w.gravityMagnitude),
    b: w.bouncy ? 1 : 0,
    o: w.objects.map((o) => [o.kind === 'cube' ? 1 : 0, o.heavy ? 1 : 0, r2(o.pos[0]), r2(o.pos[1]), r2(o.pos[2]), o.gen ?? 0]),
    r: w.rules.map((r) => ({
      name: r.name, trigger: r.trigger, effect: r.effect, cooldownS: r.cooldownS, enabled: r.enabled,
      ...(r.durationS !== undefined ? { durationS: r.durationS } : {}), ...(r.presetId ? { presetId: r.presetId } : {}),
    })),
  }
  const token = toB64(JSON.stringify(payload))
  if (token.length > SHARE_LIMITS.chars) return { ok: false, error: `This world is too large for a link (${token.length} characters; the limit is ${SHARE_LIMITS.chars}). Remove objects or rules.` }
  return { ok: true, token }
}

/** Returns the token if `hash` is a share fragment, else null. */
export const tokenFromHash = (hash: string): string | null => (hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : null)
export const shareUrl = (token: string, base: string) => `${base.split('#')[0]}${PREFIX}${token}`

export function decodeShare(token: string): Result<{ world: WorldState; notes: string[] }> {
  if (!token) return { ok: false, error: 'The share link is empty.' }
  if (token.length > SHARE_LIMITS.chars) return { ok: false, error: `The share link is too large (more than ${SHARE_LIMITS.chars} characters).` }
  if (!/^[A-Za-z0-9_-]+$/.test(token)) return { ok: false, error: 'The share link contains invalid characters.' }
  let p: unknown
  try { p = JSON.parse(fromB64(token)) } catch { return { ok: false, error: 'The share link is damaged and could not be read.' } }
  if (typeof p !== 'object' || p === null || Array.isArray(p)) return { ok: false, error: 'The share link has an unexpected format.' }
  const d = p as Record<string, unknown>
  if (d.v !== 1) return { ok: false, error: 'This share link was made by an unsupported version.' }
  if (!Array.isArray(d.o) || d.o.length === 0) return { ok: false, error: 'The shared world has no objects.' }
  if (d.o.length > SHARE_LIMITS.objects) return { ok: false, error: `The shared world has too many objects (limit ${SHARE_LIMITS.objects}).` }
  const rules = Array.isArray(d.r) ? d.r : []
  if (rules.length > SHARE_LIMITS.rules) return { ok: false, error: `The shared world has too many rules (limit ${SHARE_LIMITS.rules}).` }
  const gravityMode = typeof d.g === 'string' ? GINV[d.g] : undefined
  if (!gravityMode) return { ok: false, error: 'The share link has an invalid gravity setting.' }

  const objects: unknown[] = []
  for (let i = 0; i < d.o.length; i++) {
    const row = d.o[i] as unknown
    if (!Array.isArray(row) || row.length !== 6 || !row.every((x) => typeof x === 'number' && Number.isFinite(x))) return { ok: false, error: 'The share link has an invalid object entry.' }
    objects.push({ id: i + 1, kind: row[0] === 1 ? 'cube' : 'sphere', heavy: row[1] === 1, pos: [row[2], row[3], row[4]], gen: row[5] })
  }
  // Same validation as local saves: allowlists, clamping, per-rule validation.
  const v = validateSave({
    version: 1, name: 'Shared', savedAt: '', world: 'chamber-001', gravityMode, gravityMagnitude: typeof d.m === 'number' ? d.m : 9.81,
    bouncy: d.b === 1, paused: false, objects, rules,
  })
  if (!v.ok) return { ok: false, error: `The shared world is invalid: ${v.error}` }
  return { ok: true, world: saveToWorld(v.save), notes: v.notes }
}
