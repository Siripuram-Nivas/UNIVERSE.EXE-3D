import { getState, say, setGravityMode, setMic } from '../store'
import { ClapDetector } from './clap'

export interface MicEnv {
  getUserMedia?: (c: MediaStreamConstraints) => Promise<MediaStream>
  createContext?: () => AudioContext
  now?: () => number
  setInterval?: (fn: () => void, ms: number) => number
  clearInterval?: (id: number) => void
}

const defaultEnv = (): MicEnv => ({
  getUserMedia: typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia ? (c) => navigator.mediaDevices.getUserMedia(c) : undefined,
  createContext: typeof AudioContext !== 'undefined' ? () => new AudioContext() : undefined,
  now: () => performance.now(),
  setInterval: (fn, ms) => window.setInterval(fn, ms),
  clearInterval: (id) => window.clearInterval(id),
})

interface Session { stream: MediaStream; ctx: AudioContext; timer: number; clear: (id: number) => void }
let session: Session | null = null
let token = 0

/** A clap flips gravity between normal and reverse (zero becomes normal). Manual controls stay available. */
export function clapAction() {
  const next = getState().gravityMode === 'reverse' ? 'normal' : 'reverse'
  setGravityMode(next)
  say(`Clap heuristic triggered: gravity ${next}.`)
}

/** Starts listening. Audio is analysed locally (RMS level only); nothing is recorded, stored or sent. */
export async function startMic(env: MicEnv = defaultEnv(), onClap: () => void = clapAction): Promise<void> {
  if (session || getState().micStatus === 'requesting') return
  if (!env.getUserMedia || !env.createContext || !env.setInterval) { setMic('unavailable'); say('Microphone is not available in this browser.', false); return }
  const my = ++token
  setMic('requesting')
  let stream: MediaStream
  try {
    stream = await env.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
  } catch (e) {
    const denied = e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
    setMic(denied ? 'denied' : 'unavailable')
    say(denied ? 'Microphone permission was denied. Gravity can still be changed manually.' : 'No usable microphone was found.', false)
    return
  }
  if (my !== token) { stream.getTracks().forEach((t) => t.stop()); return } // disabled while the prompt was open
  const ctx = env.createContext()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  ctx.createMediaStreamSource(stream).connect(analyser)
  const buf = new Float32Array(analyser.fftSize)
  const detector = new ClapDetector({ sensitivity: () => getState().micSensitivity })
  const now = env.now ?? (() => Date.now())
  const timer = env.setInterval(() => {
    analyser.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
    if (detector.feed(Math.sqrt(sum / buf.length), now())) onClap()
  }, 25)
  session = { stream, ctx, timer, clear: env.clearInterval ?? (() => {}) }
  setMic('on')
  say('Microphone on. Clap to flip gravity (heuristic detector).')
}

export function stopMic() {
  token++
  if (session) {
    session.clear(session.timer)
    session.stream.getTracks().forEach((t) => t.stop())
    void session.ctx.close()
    session = null
  }
  if (getState().micStatus !== 'off') setMic('off')
}

export const micActive = () => session !== null
