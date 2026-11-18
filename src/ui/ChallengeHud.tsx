import { useState } from 'react'
import { Lightbulb, RotateCcw, LogOut, ArrowRight } from 'lucide-react'
import { CHALLENGES, getChallenge } from '../challenges/defs'
import { enterChallenge, exitChallenge, restartChallenge } from '../challenges/session'
import { useStore } from '../store'

/** Objective, progress and controls for the active challenge. HTML overlay on top of the live 3D world. */
export function ChallengeHud() {
  const c = useStore((s) => s.challenge)
  const [hint, setHint] = useState(false)
  if (!c) return null
  const def = getChallenge(c.id)
  if (!def) return null
  const done = c.status === 'complete'
  const next = CHALLENGES[CHALLENGES.findIndex((x) => x.id === def.id) + 1]
  const pct = Math.round((c.progress / c.target) * 100)

  return (
    <>
      <section className="hud glass" aria-label="Challenge objective">
        <div className="hud-title"><b>{def.title}</b><span>{def.objective}</span></div>
        <div className="hud-progress" role="progressbar" aria-valuemin={0} aria-valuemax={c.target} aria-valuenow={c.progress} aria-label="Challenge progress">
          <i style={{ width: `${pct}%` }} />
          <small>{def.win.type === 'spawns' ? `${c.progress} / ${c.target} spawned` : done ? 'Delivered' : 'Reach the ring'}</small>
        </div>
        <div className="hud-actions">
          <button className="icon-btn" aria-pressed={hint} title="Hint" onClick={() => setHint(!hint)}><Lightbulb size={16} aria-hidden /><span className="sr-only">Toggle hint</span></button>
          <button className="icon-btn" title="Restart" onClick={() => restartChallenge()}><RotateCcw size={16} aria-hidden /><span className="sr-only">Restart challenge</span></button>
          <button className="icon-btn" title="Exit to sandbox" onClick={() => exitChallenge()}><LogOut size={16} aria-hidden /><span className="sr-only">Exit to sandbox</span></button>
        </div>
        {hint && <p className="hud-hint">{def.hint}</p>}
      </section>
      {done && (
        <div className="solved" role="dialog" aria-label="Challenge complete">
          <h2>REALITY SOLVED</h2>
          <p>{def.title} complete.</p>
          <div className="solved-actions">
            <button className="btn" autoFocus onClick={() => restartChallenge()}><RotateCcw size={14} aria-hidden /> Replay</button>
            {next && <button className="btn lime" onClick={() => enterChallenge(next.id)}>Next <ArrowRight size={14} aria-hidden /></button>}
            <button className="btn" onClick={() => exitChallenge()}><LogOut size={14} aria-hidden /> Sandbox</button>
          </div>
        </div>
      )}
    </>
  )
}
