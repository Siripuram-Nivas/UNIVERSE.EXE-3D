import { Play, X } from 'lucide-react'
import { enterShared } from '../demo/session'
import { describeRule } from '../reality/describe'
import { say, setSharedPreview, useStore } from '../store'

/** Shown when the page is opened from a share link. Nothing is loaded until the user presses Play. */
export function SharedPreviewCard() {
  const p = useStore((s) => s.sharedPreview)
  if (!p) return null
  if (!p.ok) {
    return (
      <div className="welcome glass err-card" role="alertdialog" aria-label="Share link problem">
        <h2>That link could not be opened</h2>
        <p>{p.error}</p>
        <div className="solved-actions"><button className="btn" autoFocus onClick={() => setSharedPreview(null)}>Continue to the sandbox</button></div>
      </div>
    )
  }
  const w = p.world
  const spheres = w.objects.filter((o) => o.kind === 'sphere').length
  return (
    <div className="welcome glass" role="dialog" aria-label="Shared experiment preview">
      <h2>Shared experiment</h2>
      <p>{spheres} spheres, {w.objects.length - spheres} cubes, gravity {w.gravityMode}{w.bouncy ? ', bouncy' : ''}.</p>
      {w.rules.length > 0 && <ul className="preview-rules">{w.rules.map((r) => <li key={r.id}>{describeRule(r)}</li>)}</ul>}
      {p.notes.length > 0 && <p className="meta">{p.notes.join(' ')}</p>}
      <p className="hint">Rules in a shared world only use the built-in allowlist. Your sandbox is kept and restored when you exit.</p>
      <div className="solved-actions">
        <button className="btn accent" autoFocus onClick={() => enterShared(w)}><Play size={14} aria-hidden /> Play</button>
        <button className="btn" onClick={() => { setSharedPreview(null); say('Shared experiment dismissed.') }}><X size={14} aria-hidden /> Dismiss</button>
      </div>
    </div>
  )
}
