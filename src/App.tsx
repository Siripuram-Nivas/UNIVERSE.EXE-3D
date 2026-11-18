import { lazy, Suspense, useEffect, useState } from 'react'
import { PanelLeft, PanelRight } from 'lucide-react'
import { ErrorBoundary } from './ErrorBoundary'
import { CommandBar } from './ui/CommandBar'
import { LeftPanel } from './ui/LeftPanel'
import { RightPanel } from './ui/RightPanel'
import { TopBar } from './ui/TopBar'
import { ChallengeHud } from './ui/ChallengeHud'
import { stopMic } from './controls/mic'
import { checkAiAvailable } from './reality/compiler'
import { select, selectNext, setAiStatus, useStore } from './store'

// The 3D bundle (three + Rapier WASM) loads as separate chunks so the interface shell paints first.
const Scene = lazy(() => import('./scene/Scene').then((m) => ({ default: m.Scene })))

export function App() {
  const ready = useStore((s) => s.ready)
  const paused = useStore((s) => s.paused)
  const hasHud = useStore((s) => s.challenge !== null)
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 1000px)').matches
  const [left, setLeft] = useState(wide)
  const [right, setRight] = useState(wide)

  useEffect(() => {
    void checkAiAvailable().then((ok) => setAiStatus(ok ? 'ready' : 'unavailable'))
  }, [])

  useEffect(() => stopMic, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (e.key === ']') selectNext(1)
      else if (e.key === '[') selectNext(-1)
      else if (e.key === 'Escape') select(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`app ${hasHud ? 'has-hud' : ''}`}>
      <div className={`viewport ${paused ? 'frozen' : ''}`}>
        <ErrorBoundary>
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </ErrorBoundary>
      </div>
      {!ready && (
        <div className="loading" role="status" aria-live="polite">
          <div className="loading-ring" />
          <span>INITIALIZING PHYSICS CORE…</span>
        </div>
      )}
      <TopBar />
      <ChallengeHud />
      <div className="side-toggles">
        <button className="icon-btn" aria-expanded={left} aria-controls="left-panel" onClick={() => setLeft(!left)} title="Toggle laws panel">
          <PanelLeft size={18} aria-hidden /> <span className="sr-only">Toggle laws panel</span>
        </button>
        <button className="icon-btn" aria-expanded={right} aria-controls="right-panel" onClick={() => setRight(!right)} title="Toggle objects panel">
          <PanelRight size={18} aria-hidden /> <span className="sr-only">Toggle objects panel</span>
        </button>
      </div>
      {left && <LeftPanel />}
      {right && <RightPanel />}
      <CommandBar />
    </div>
  )
}
