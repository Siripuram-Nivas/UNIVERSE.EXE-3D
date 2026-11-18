import { LIMITS, type RuleDraft } from './types'
import { validateRule } from './validator'

export type CompileResult =
  | { status: 'rule'; draft: RuleDraft; notes: string[] }
  | { status: 'unsupported'; reason: string }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; reason: string }

const TIMEOUT_MS = 20_000

/** Never trusts the endpoint: whatever comes back is validated again against the allowlisted schema. */
export function parseCompileResponse(body: unknown): CompileResult {
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  if (b.status === 'unsupported') {
    return { status: 'unsupported', reason: typeof b.reason === 'string' ? b.reason.slice(0, 300) : 'Unsupported request.' }
  }
  if (b.status === 'rule') {
    const v = validateRule(b.draft)
    return v.ok ? { status: 'rule', draft: v.draft, notes: v.notes } : { status: 'error', reason: `AI proposed an invalid rule: ${v.errors.join(' ')}` }
  }
  return { status: 'error', reason: 'Unexpected response from the AI endpoint.' }
}

export async function compileText(
  text: string,
  opts: { signal?: AbortSignal; fetchImpl?: typeof fetch; endpoint?: string } = {},
): Promise<CompileResult> {
  const input = text.trim()
  if (!input) return { status: 'error', reason: 'Enter an instruction first.' }
  if (input.length > LIMITS.maxInputChars) return { status: 'error', reason: `Keep instructions under ${LIMITS.maxInputChars} characters.` }
  const f = opts.fetchImpl ?? fetch
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout
  try {
    const res = await f(opts.endpoint ?? '/api/compile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: input }),
      signal,
    })
    if (res.status === 503 || res.status === 404) return { status: 'unavailable', reason: 'AI compiler is not enabled on this server.' }
    let body: unknown
    try { body = await res.json() } catch { return { status: 'error', reason: 'AI endpoint returned an unreadable response.' } }
    if (!res.ok) {
      const msg = (body as { error?: unknown }).error
      return { status: 'error', reason: typeof msg === 'string' ? msg : `AI endpoint error (${res.status}).` }
    }
    return parseCompileResponse(body)
  } catch (e) {
    if (opts.signal?.aborted) return { status: 'error', reason: 'Compilation cancelled.' }
    return { status: 'unavailable', reason: e instanceof Error && e.name === 'TimeoutError' ? 'The AI request timed out.' : 'Could not reach the AI endpoint.' }
  }
}

/** One cheap GET (no model call) to learn whether the server has credentials. */
export async function checkAiAvailable(fetchImpl: typeof fetch = fetch, endpoint = '/api/compile'): Promise<boolean> {
  try {
    const res = await fetchImpl(endpoint, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return false
    const body = (await res.json()) as { configured?: unknown }
    return body.configured === true
  } catch {
    return false
  }
}
