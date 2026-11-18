export interface ClapOptions {
  /** 1 (needs a loud clap) .. 10 (very sensitive). */
  sensitivity: () => number
  cooldownMs?: number
  /** A clap is a short transient; louder sounds that last longer than this are ignored (speech, music, fans). */
  maxBurstMs?: number
}

/**
 * Energy-transient heuristic, NOT real clap recognition. Feed it RMS levels (0..1) with timestamps.
 * A clap = level rises above an adaptive threshold and falls back within maxBurstMs, outside the cooldown.
 */
export class ClapDetector {
  private baseline = 0.01
  private hot = false
  private hotSince = 0
  private rejected = false
  private lastClap = -Infinity
  private cooldownMs: number
  private maxBurstMs: number

  constructor(private opts: ClapOptions) {
    this.cooldownMs = opts.cooldownMs ?? 900
    this.maxBurstMs = opts.maxBurstMs ?? 160
  }

  private threshold() {
    const s = Math.min(10, Math.max(1, this.opts.sensitivity()))
    return Math.max(0.25 - 0.02 * s, this.baseline * (7 - 0.5 * s))
  }

  feed(rms: number, nowMs: number): boolean {
    if (!Number.isFinite(rms)) return false
    const thr = this.threshold()
    if (!this.hot) {
      if (rms > thr) { this.hot = true; this.hotSince = nowMs; this.rejected = false }
      else this.baseline += (rms - this.baseline) * 0.05 // learn the room's background level
      return false
    }
    if (nowMs - this.hotSince > this.maxBurstMs) this.rejected = true
    if (rms <= thr * 0.6) {
      this.hot = false
      const ok = !this.rejected && nowMs - this.lastClap >= this.cooldownMs
      if (ok) this.lastClap = nowMs
      return ok
    }
    return false
  }
}
