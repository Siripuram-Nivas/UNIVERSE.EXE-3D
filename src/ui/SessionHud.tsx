import { ArrowRight, Flame, LogOut, RotateCcw, Share2, Swords } from 'lucide-react'
import { exitChallenge, switchMode } from '../challenges/session'
import { breakReality, remixShared, replayBreak, replayShared } from '../demo/session'
import { useStore } from '../store'

/** Guided-experiment overlay (Break Reality, or a shared world). The 3D world stays the main view. */
export function SessionHud() {
  const session = useStore((s) => s.session)
  const gravity = useStore((s) => s.gravityMode)
  if (!session) return null

  if (session.type === 'shared') {
    return (
      <section className="hud glass" aria-label="Shared experiment">
        <div className="hud-title"><b><Share2 size={12} aria-hidden /> Shared experiment</b><span>Playing someone else's world. Its rules are live.</span></div>
        <div className="hud-actions session-actions">
          <button className="btn" onClick={() => replayShared()}><RotateCcw size={14} aria-hidden /> Replay</button>
          <button className="btn lime" title="Keep this world as your sandbox (replaces the one you left)" onClick={() => remixShared()}>Remix</button>
          <button className="btn" onClick={() => exitChallenge()}><LogOut size={14} aria-hidden /> Exit</button>
        </div>
      </section>
    )
  }

  const broken = session.phase === 'broken'
  const restored = broken && gravity === 'normal'
  return (
    <section className="hud glass break-hud" aria-label="Break Reality">
      <div className="hud-title">
        <b><Flame size={12} aria-hidden /> Break Reality</b>
        <span aria-live="polite">
          {!broken && 'Press the button. A rule will flip gravity for 2.5 seconds.'}
          {broken && !restored && 'Gravity is REVERSED. Watch everything rise.'}
          {restored && 'Reality restored. Gravity is normal again.'}
        </span>
      </div>
      {!broken ? (
        <button className="btn accent big" autoFocus onClick={() => breakReality()}>
          <Flame size={16} aria-hidden /> Break Reality
        </button>
      ) : (
        <div className="hud-actions session-actions">
          <button className="btn" autoFocus onClick={() => replayBreak()}><RotateCcw size={14} aria-hidden /> Replay</button>
          <button className="btn lime" onClick={() => exitChallenge()}>Explore Sandbox <ArrowRight size={14} aria-hidden /></button>
          <button className="btn" onClick={() => { exitChallenge(); switchMode('challenges') }}><Swords size={14} aria-hidden /> Try Challenges</button>
        </div>
      )}
      {!broken && <button className="link-btn" onClick={() => exitChallenge()}>Skip, go to sandbox</button>}
    </section>
  )
}
