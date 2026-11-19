import { lazy, Suspense, useEffect, useState } from 'react'
import { PanelLeft, PanelRight } from 'lucide-react'
import { ErrorBoundary } from './ErrorBoundary'
import { CommandBar } from './ui/CommandBar'
import { LeftPanel } from './ui/LeftPanel'
import { RightPanel } from './ui/RightPanel'
import { TopBar } from './ui/TopBar'
import { ChallengeHud } from './ui/ChallengeHud'
import { SessionHud } from './ui/SessionHud'
import { SharedPreviewCard } from './ui/SharedPreview'
import { WelcomeCard } from './ui/WelcomeCard'
import { decodeShare, tokenFromHash } from './world/share'
import { stopMic } from './controls/mic'
import { checkAiAvailable } from './reality/compiler'
import { select, selectNext, setAiStatus, setSharedPreview, useStore } from './store'

// The 3D bundle (three + Rapier WASM) loads as separate chunks so the interface shell paints first.
const Scene = lazy(() => import('./scene/Scene').then((m) => ({ default: m.Scene })))

export function App() {
  const ready = useStore((s) => s.ready)
  const paused = useStore((s) => s.paused)
  const hasHud = useStore((s) => s.challenge !== null || s.session !== null)
  const mode = useStore((s) => s.mode)
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 1000px)').matches
  const [left, setLeft] = useState(wide)
  const [right, setRight] = useState(wide)

  useEffect(() => {
    void checkAiAvailable().then((ok) => setAiStatus(ok ? 'ready' : 'unavailable'))
  }, [])

  useEffect(() => stopMic, [])

  // Opening a share link (#w=...) shows a preview card. The fragment is removed so a refresh does not re-open it.
  useEffect(() => {
    const token = tokenFromHash(window.location.hash)
    if (token === null) return
    const r = decodeShare(token)
    setSharedPreview(r.ok ? { ok: true, world: r.world, notes: r.notes } : { ok: false, error: r.error })
    history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [])

  // Choosing "Challenges" must reveal the level list, including on small screens where panels start closed.
  useEffect(() => {
    if (mode === 'challenges') setLeft(true)
  }, [mode])

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
      <SessionHud />
      <WelcomeCard />
      <SharedPreviewCard />
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
