import { useState } from 'react'
import { PanelLeft, PanelRight } from 'lucide-react'
import { Scene } from './scene/Scene'
import { CommandBar } from './ui/CommandBar'
import { LeftPanel } from './ui/LeftPanel'
import { RightPanel } from './ui/RightPanel'
import { TopBar } from './ui/TopBar'
import { useStore } from './store'

export function App() {
  const ready = useStore((s) => s.ready)
  const wide = typeof window !== 'undefined' && window.matchMedia('(min-width: 1000px)').matches
  const [left, setLeft] = useState(wide)
  const [right, setRight] = useState(wide)

  return (
    <div className="app">
      <div className="viewport">
        <Scene />
      </div>
      {!ready && (
        <div className="loading" role="status" aria-live="polite">
          <div className="loading-ring" />
          <span>INITIALIZING PHYSICS CORE…</span>
        </div>
      )}
      <TopBar />
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
