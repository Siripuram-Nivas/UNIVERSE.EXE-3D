import { ArrowDown, ArrowUp, Circle, Pause, Play, Zap } from 'lucide-react'
import { ChallengesSection } from './ChallengesSection'
import { HumanControls } from './HumanControls'
import { RecipesSection } from './RecipesSection'
import { SavePanel } from './SavePanel'
import { say, setBouncy, setGravityMagnitude, setGravityMode, setPaused, useStore, type GravityMode } from '../store'

const MODES: { mode: GravityMode; label: string; Icon: typeof ArrowDown }[] = [
  { mode: 'normal', label: 'Normal', Icon: ArrowDown },
  { mode: 'zero', label: 'Zero', Icon: Circle },
  { mode: 'reverse', label: 'Reverse', Icon: ArrowUp },
]

export function LeftPanel() {
  const mode = useStore((s) => s.gravityMode)
  const mag = useStore((s) => s.gravityMagnitude)
  const paused = useStore((s) => s.paused)
  const bouncy = useStore((s) => s.bouncy)
  const uiMode = useStore((s) => s.mode)

  return (
    <aside id="left-panel" className="panel left glass" aria-label="Laws of physics">
      {uiMode === 'challenges' && <ChallengesSection />}

      <section>
        <h2>Gravity</h2>
        <div className="seg" role="group" aria-label="Gravity mode">
          {MODES.map(({ mode: m, label, Icon }) => (
            <button
              key={m}
              className={mode === m ? 'active' : ''}
              aria-pressed={mode === m}
              onClick={() => { setGravityMode(m); say(`Gravity: ${label.toLowerCase()}.`) }}
            >
              <Icon size={14} aria-hidden /> {label}
            </button>
          ))}
        </div>
        <label className="slider">
          <span>Magnitude <b>{mag.toFixed(1)} m/s²</b></span>
          <input
            type="range" min={1} max={30} step={0.5} value={mag}
            disabled={mode === 'zero'}
            onChange={(e) => setGravityMagnitude(Number(e.target.value))}
          />
        </label>
      </section>

      <section>
        <h2>Time</h2>
        <button className={`btn wide ${paused ? 'accent' : ''}`} onClick={() => setPaused(!paused)}>
          {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
          {paused ? 'Resume time' : 'Freeze time'}
        </button>
      </section>

      <section>
        <h2>World parameters</h2>
        <label className="toggle">
          <input type="checkbox" checked={bouncy} onChange={(e) => setBouncy(e.target.checked)} />
          <span><Zap size={14} aria-hidden /> Everything bouncy</span>
        </label>
      </section>

      <section>
        <h2>Active laws</h2>
        <ul className="laws">
          <li><i /> Gravity: {mode === 'zero' ? 'disabled' : `${mode === 'reverse' ? 'upward' : 'downward'} ${mag.toFixed(1)} m/s²`}</li>
          <li><i /> Time: {paused ? 'frozen' : 'flowing'}</li>
          <li><i /> Collisions: {bouncy ? 'highly elastic' : 'standard'}</li>
        </ul>
      </section>
      <section>
        <RecipesSection />
      </section>
      <SavePanel />
      <HumanControls />
    </aside>
  )
}
