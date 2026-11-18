import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '../api/compile'
import { flatToDraftInput } from '../src/reality/aiSchema'
import { checkAiAvailable, compileText, parseCompileResponse } from '../src/reality/compiler'
import { validateRule } from '../src/reality/validator'

const flat = (over: Record<string, unknown> = {}) => ({
  supported: true, reason: '', name: 'Chain', trigger_type: 'collision', trigger_a: 'sphere', trigger_b: 'sphere',
  effect_type: 'spawn', spawn_kind: 'sphere', spawn_at: 'collision', impulse_target: 'none', impulse_direction: 'none',
  impulse_strength: 0, gravity_mode: 'none', bouncy: 'none', burst_color: 'none', cooldown_seconds: 1, duration_seconds: 0,
  ...over,
})
const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('flat model output mapping', () => {
  it('maps a supported flat rule to a valid draft', () => {
    const m = flatToDraftInput(flat())
    expect(m.supported).toBe(true)
    if (m.supported) expect(validateRule(m.draft).ok).toBe(true)
  })
  it('returns unsupported with the reason', () => {
    const m = flatToDraftInput(flat({ supported: false, reason: 'Black holes are not supported.' }))
    expect(m).toEqual({ supported: false, reason: 'Black holes are not supported.' })
  })
  it('model output with an unsupported effect fails validation', () => {
    const m = flatToDraftInput(flat({ effect_type: 'none' }))
    expect(m.supported && validateRule(m.draft).ok).toBe(false)
  })
  it('garbage input is treated as unsupported', () => {
    expect(flatToDraftInput('rm -rf /').supported).toBe(false)
    expect(flatToDraftInput(null).supported).toBe(false)
  })
})

describe('client compiler (mocked endpoint)', () => {
  it('returns a validated rule', async () => {
    const draft = { trigger: { type: 'collision', a: 'sphere', b: 'sphere' }, effect: { type: 'spawn', kind: 'sphere' } }
    const f = vi.fn().mockResolvedValue(jsonRes({ status: 'rule', draft }))
    const r = await compileText('when two spheres collide spawn a sphere', { fetchImpl: f })
    expect(r.status).toBe('rule')
    expect(f).toHaveBeenCalledTimes(1)
  })
  it('rejects a rule the endpoint should not have sent', () => {
    expect(parseCompileResponse({ status: 'rule', draft: { trigger: { type: 'timer' }, effect: { type: 'eval' } } }).status).toBe('error')
    expect(parseCompileResponse({ status: 'rule', draft: 'alert(1)' }).status).toBe('error')
    expect(parseCompileResponse('nope').status).toBe('error')
  })
  it('passes through unsupported explanations', async () => {
    const f = vi.fn().mockResolvedValue(jsonRes({ status: 'unsupported', reason: 'No black holes.' }))
    expect(await compileText('make 1000 black holes', { fetchImpl: f })).toEqual({ status: 'unsupported', reason: 'No black holes.' })
  })
  it('reports unavailable when the server is unconfigured or unreachable', async () => {
    const unconf = vi.fn().mockResolvedValue(jsonRes({ status: 'unconfigured' }, 503))
    expect((await compileText('hello world', { fetchImpl: unconf })).status).toBe('unavailable')
    const down = vi.fn().mockRejectedValue(new TypeError('network'))
    expect((await compileText('hello world', { fetchImpl: down })).status).toBe('unavailable')
    expect(unconf).toHaveBeenCalledTimes(1) // no automatic retry
  })
  it('does not call the network for empty or oversized input', async () => {
    const f = vi.fn()
    expect((await compileText('   ', { fetchImpl: f })).status).toBe('error')
    expect((await compileText('x'.repeat(500), { fetchImpl: f })).status).toBe('error')
    expect(f).not.toHaveBeenCalled()
  })
  it('surfaces server errors without crashing', async () => {
    const f = vi.fn().mockResolvedValue(jsonRes({ error: 'Too many requests.' }, 429))
    expect(await compileText('hello world', { fetchImpl: f })).toEqual({ status: 'error', reason: 'Too many requests.' })
  })
  it('availability check is false on failure', async () => {
    expect(await checkAiAvailable(vi.fn().mockRejectedValue(new Error('x')))).toBe(false)
    expect(await checkAiAvailable(vi.fn().mockResolvedValue(jsonRes({ configured: true })))).toBe(true)
  })
})

describe('server endpoint (mocked provider)', () => {
  const req = (text: unknown, ip = '1.1.1.1') =>
    new Request('http://x/api/compile', { method: 'POST', headers: { 'x-forwarded-for': ip }, body: JSON.stringify({ text }) })
  const model = (content: unknown, status = 200) =>
    jsonRes({ choices: [{ message: { content: typeof content === 'string' ? content : JSON.stringify(content) } }] }, status)

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.OPENAI_MODEL = 'test-model'
    process.env.AI_RATE_PER_MINUTE = '3'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_MODEL
    delete process.env.AI_RATE_PER_MINUTE
  })

  it('fails honestly with 503 and makes no provider call when unconfigured', async () => {
    delete process.env.OPENAI_API_KEY
    const f = vi.fn(); vi.stubGlobal('fetch', f)
    const res = await POST(req('anything goes here'))
    expect(res.status).toBe(503)
    expect(f).not.toHaveBeenCalled()
    expect(await GET().json()).toEqual({ configured: false })
  })
  it('compiles a rule using one provider call, sends no secrets to the client', async () => {
    const f = vi.fn().mockResolvedValue(model(flat())); vi.stubGlobal('fetch', f)
    const res = await POST(req('when two spheres collide spawn another', '2.2.2.2'))
    const body = await res.json()
    expect(body.status).toBe('rule')
    expect(JSON.stringify(body)).not.toContain('test-key')
    expect(f).toHaveBeenCalledTimes(1)
    const sent = JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)
    expect(sent.model).toBe('test-model')
    expect(sent.response_format.type).toBe('json_schema')
    expect(sent.messages.map((m: { role: string }) => m.role)).toEqual(['system', 'user'])
  })
  it('relays unsupported requests with an explanation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(model(flat({ supported: false, reason: 'Black holes are unsupported.' }))))
    const body = await (await POST(req('explode into 1000 black holes', '3.3.3.3'))).json()
    expect(body).toEqual({ status: 'unsupported', reason: 'Black holes are unsupported.' })
  })
  it('rejects invalid model output', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(model('not json at all')))
    expect((await POST(req('some instruction', '4.4.4.4'))).status).toBe(502)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(model(flat({ effect_type: 'none' }))))
    expect((await (await POST(req('some instruction', '4.4.4.5'))).json()).status).toBe('unsupported')
  })
  it('maps provider failures to clear errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonRes({}, 500)))
    expect((await POST(req('some instruction', '5.5.5.5'))).status).toBe(502)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    expect((await POST(req('some instruction', '5.5.5.6'))).status).toBe(504)
  })
  it('enforces input limits and per-IP rate limits', async () => {
    const f = vi.fn().mockImplementation(async () => model(flat())); vi.stubGlobal('fetch', f)
    expect((await POST(req('x'.repeat(201), '6.6.6.6'))).status).toBe(400)
    expect((await POST(req('', '6.6.6.6'))).status).toBe(400)
    expect(f).not.toHaveBeenCalled()
    for (let i = 0; i < 3; i++) expect((await POST(req('some instruction', '7.7.7.7'))).status).toBe(200)
    expect((await POST(req('some instruction', '7.7.7.7'))).status).toBe(429)
    expect(f).toHaveBeenCalledTimes(3)
  })
})
