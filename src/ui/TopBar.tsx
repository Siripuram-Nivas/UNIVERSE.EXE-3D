import { Pause, Play, RotateCcw, Settings } from 'lucide-react'
import { resetUniverse, say, setPaused, toggleQuality, useStore, WORLD_NAME } from '../store'

export function TopBar() {
  const paused = useStore((s) => s.paused)
  const low = useStore((s) => s.lowQuality)
  return (
    <header className="topbar glass">
      <div className="brand">
        UNIVERSE<span>.EXE</span>
      </div>
      <div className="world-name">{WORLD_NAME}</div>
      <div className={`status ${paused ? 'paused' : 'running'}`} role="status">
        {paused ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
        {paused ? 'TIME FROZEN' : 'SIMULATION RUNNING'}
      </div>
      <div className="top-actions">
        <button className={`icon-btn ${low ? 'on' : ''}`} aria-pressed={low} onClick={() => { toggleQuality(); say(low ? 'Quality: high (sharper rendering).' : 'Quality: low (reduced resolution for smoother frame rate).') }} title="Toggle low-quality rendering">
          <Settings size={16} aria-hidden /> <span className="sr-only">Low-quality rendering</span>
        </button>
        <button className="icon-btn danger" onClick={() => { resetUniverse(); say('Universe reset to its initial state.') }} title="Reset universe">
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
