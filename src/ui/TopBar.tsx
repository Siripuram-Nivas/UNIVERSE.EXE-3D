import { Pause, Play, RotateCcw, Settings } from 'lucide-react'
import { resetWorld, switchMode } from '../challenges/session'
import { getChallenge } from '../challenges/defs'
import { say, setPaused, toggleQuality, useStore, WORLD_NAME } from '../store'

export function TopBar() {
  const paused = useStore((s) => s.paused)
  const low = useStore((s) => s.lowQuality)
  const mode = useStore((s) => s.mode)
  const cid = useStore((s) => s.challenge?.id)
  const title = cid ? getChallenge(cid)?.title : undefined
  return (
    <header className="topbar glass">
      <div className="brand">
        UNIVERSE<span>.EXE</span>
      </div>
      <div className="mode-switch seg" role="group" aria-label="Mode">
        <button className={mode === 'sandbox' ? 'active' : ''} aria-pressed={mode === 'sandbox'} onClick={() => switchMode('sandbox')}>Sandbox</button>
        <button className={mode === 'challenges' ? 'active' : ''} aria-pressed={mode === 'challenges'} onClick={() => switchMode('challenges')}>Challenges</button>
      </div>
      <div className="world-name">{title ? `CHALLENGE — ${title.toUpperCase()}` : WORLD_NAME}</div>
      <div className={`status ${paused ? 'paused' : 'running'}`} role="status">
        {paused ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
        <span className="status-text">{paused ? 'TIME FROZEN' : 'SIMULATION RUNNING'}</span>
      </div>
      <div className="top-actions">
        <button className={`icon-btn ${low ? 'on' : ''}`} aria-pressed={low} onClick={() => { toggleQuality(); say(low ? 'Quality: high (sharper rendering).' : 'Quality: low (reduced resolution for smoother frame rate).') }} title="Toggle low-quality rendering">
          <Settings size={16} aria-hidden /> <span className="sr-only">Low-quality rendering</span>
        </button>
        <button className="icon-btn danger" onClick={() => resetWorld()} title="Reset (restarts the level during a challenge)">
          <RotateCcw size={16} aria-hidden /> <span className="sr-only">Reset universe</span>
        </button>
        <button className="icon-btn" onClick={() => setPaused(!paused)} title={paused ? 'Resume time' : 'Freeze time'}>
          {paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />}
          <span className="sr-only">{paused ? 'Resume time' : 'Freeze time'}</span>
        </button>
      </div>
    </header>
  )
}
