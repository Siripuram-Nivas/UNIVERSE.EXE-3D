/**
 * POST /api/compile  { text }  ->  { status: 'rule', draft, notes } | { status: 'unsupported', reason }
 * GET  /api/compile            ->  { configured: boolean }   (no model call)
 *
 * Server-side only. Secrets come from process.env (never VITE_*). The endpoint is OFF unless all three are set:
 *   AI_ENABLED=true, OPENAI_API_KEY, OPENAI_MODEL      (otherwise 503 and no provider call)
 * Optional: AI_RATE_PER_MINUTE (default 6 per IP), AI_DAILY_LIMIT (default 200 per instance).
 * These limits are in-memory and best effort: serverless instances do not share memory, so they are NOT a
 * reliable abuse barrier. For a public deployment also set a spend cap at the provider and a Vercel
 * Firewall rate-limit rule on /api/compile (see README).
 */
import { FLAT_SCHEMA, SYSTEM_PROMPT, flatToDraftInput } from '../src/reality/aiSchema.js'
import { LIMITS } from '../src/reality/types.js'
import { validateRule } from '../src/reality/validator.js'

const MAX_BODY = 2_000
const MAX_MODEL_BYTES = 8_000
const TIMEOUT_MS = 15_000

const hits = new Map<string, number[]>()
let day = new Date().toDateString()
let dayCount = 0

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

const configured = () => process.env.AI_ENABLED === 'true' && Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL)

/** Browsers always send Origin on cross-site POSTs. Reject those so other websites cannot spend our quota from a visitor's browser. */
function crossSite(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try { return new URL(origin).host !== request.headers.get('host') } catch { return true }
}

function limited(ip: string): string | null {
  const now = Date.now()
  const today = new Date().toDateString()
  if (today !== day) { day = today; dayCount = 0 }
  if (dayCount >= Number(process.env.AI_DAILY_LIMIT || 200)) return 'Daily AI usage limit reached. Try again tomorrow.'
  const per = Number(process.env.AI_RATE_PER_MINUTE || 6)
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  if (list.length >= per) return 'Too many requests. Wait a minute and try again.'
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 1000) hits.clear()
  dayCount++
  return null
}

export function GET() {
  return json({ configured: configured() })
}

export async function POST(request: Request): Promise<Response> {
  if (!configured()) return json({ status: 'unconfigured', error: 'AI compiler is not enabled on this server.' }, 503)
  if (crossSite(request)) return json({ status: 'error', error: 'Cross-site requests are not allowed.' }, 403)
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) return json({ status: 'error', error: 'Request too large.' }, 413)

  const raw = await request.text()
  if (raw.length > MAX_BODY) return json({ status: 'error', error: 'Request too large.' }, 413)
  let text: unknown
  try { text = (JSON.parse(raw) as { text?: unknown }).text } catch { return json({ status: 'error', error: 'Invalid JSON.' }, 400) }
  if (typeof text !== 'string' || !text.trim()) return json({ status: 'error', error: 'Provide a non-empty "text".' }, 400)
  if (text.length > LIMITS.maxInputChars) return json({ status: 'error', error: `Keep instructions under ${LIMITS.maxInputChars} characters.` }, 400)

  const ip = (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
  const why = limited(ip)
  if (why) return json({ status: 'error', error: why }, 429)

  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        max_completion_tokens: 400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text.trim() },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'reality_rule', strict: true, schema: FLAT_SCHEMA } },
      }),
    })
  } catch {
    return json({ status: 'error', error: 'The AI service timed out or is unreachable.' }, 504)
  }
  if (!res.ok) return json({ status: 'error', error: `The AI service returned an error (${res.status}).` }, 502)

  let content: string | undefined
  try {
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    content = data.choices?.[0]?.message?.content
  } catch { /* handled below */ }
  if (!content || content.length > MAX_MODEL_BYTES) return json({ status: 'error', error: 'The AI returned an unusable response.' }, 502)

  let flat: unknown
  try { flat = JSON.parse(content) } catch { return json({ status: 'error', error: 'The AI returned invalid JSON.' }, 502) }

  const mapped = flatToDraftInput(flat)
  if (!mapped.supported) return json({ status: 'unsupported', reason: mapped.reason })
  const v = validateRule(mapped.draft)
  if (!v.ok) return json({ status: 'unsupported', reason: `The model proposed an invalid rule: ${v.errors.join(' ')}` })
  return json({ status: 'rule', draft: v.draft, notes: v.notes })
}
