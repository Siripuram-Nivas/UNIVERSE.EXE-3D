import { useEffect, useState } from 'react'
import { ArrowUpFromLine, Box, CircleDot, Crosshair, Move, Orbit, Rotate3d, Shrink, Trash2, Waves, Weight } from 'lucide-react'
import { getChallenge } from '../challenges/defs'
import { bodies, pushBody, type PushKind } from '../physicsRegistry'
import { FORCE_LABEL, type ForceKind } from '../physics/force'
import { fireForce, forceLabBlock } from '../physics/forceLab'
import { clearObjects, fireBurst, getState, MAX_OBJECTS, say, select, selectNext, spawn, useStore, type Kind } from '../store'

function add(kind: Kind, heavy = false) {
  if (getState().challenge) return say('Spawning is disabled during challenges.', false)
  if (!spawn(kind, heavy)) say(`Object cap reached (${MAX_OBJECTS}). Clear some objects first.`, false)
  else {
    fireBurst('yellow')
    say(`Spawned a ${heavy ? 'heavy ' : ''}${kind}.`)
  }
}

function SelectedInfo({ id }: { id: number }) {
  const obj = useStore((s) => s.objects.find((o) => o.id === id))
  const paused = useStore((s) => s.paused)
  const cid = useStore((s) => s.challenge?.id)
  const session = useStore((s) => s.session)
  const blocked = (cid && getChallenge(cid)?.blockedPush) || []
  const forceBlock = forceLabBlock({ challenge: cid ?? null, session, paused, selectedId: id }, bodies.has(id))
  const [info, setInfo] = useState({ pos: '—', speed: '—' })
  useEffect(() => {
    const tick = () => {
      const b = bodies.get(id)
      if (!b) return
      const p = b.translation()
      const v = b.linvel()
      setInfo({
        pos: `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`,
        speed: `${Math.hypot(v.x, v.y, v.z).toFixed(1)} m/s`,
      })
    }
    tick()
    const t = setInterval(tick, 250)
    return () => clearInterval(t)
  }, [id])
  if (!obj) return null

  const act = (kind: PushKind, label: string) => (
    <button className="btn" disabled={blocked.includes(kind)} title={blocked.includes(kind) ? 'Disabled in this challenge' : undefined} onClick={() => {
        if (!pushBody(id, kind)) {
          say(`${label} failed: object #${id} is not in the physics world.`, false)
          return
        }
        fireBurst('orange')
        say(paused ? `${label} applied to #${id}. It takes effect when time resumes.` : `${label} applied to #${id}.`)
      }}>
      {kind === 'throw' ? <Crosshair size={14} aria-hidden /> : kind === 'push' ? <Move size={14} aria-hidden /> : kind === 'launch' ? <ArrowUpFromLine size={14} aria-hidden /> : <Rotate3d size={14} aria-hidden />}
      {label}
    </button>
  )

  return (
    <div className="selected">
      <dl>
        <dt>Object</dt><dd>#{id} {obj.heavy ? 'heavy ' : ''}{obj.kind}</dd>
        <dt>Position</dt><dd>{info.pos}</dd>
        <dt>Speed</dt><dd>{info.speed}</dd>
      </dl>
      <div className="grid2">
        {act('throw', 'Throw')}
        {act('push', 'Push')}
        {act('launch', 'Launch up')}
        {act('spin', 'Spin')}
        {act('xp', 'Nudge +X')}
        {act('xn', 'Nudge −X')}
        {act('zp', 'Nudge +Z')}
        {act('zn', 'Nudge −Z')}
      </div>
      <h3 className="sub">Force Lab</h3>
      <div className="grid3" role="group" aria-label="Force Lab: one-time impulses on nearby objects">
        {(['shockwave', 'implosion', 'vortex'] as ForceKind[]).map((k) => (
          <button key={k} className="btn force" disabled={forceBlock !== null} title={forceBlock ?? `${FORCE_LABEL[k]} around #${id}`} onClick={() => fireForce(k)}>
            {k === 'shockwave' ? <Waves size={14} aria-hidden /> : k === 'implosion' ? <Shrink size={14} aria-hidden /> : <Orbit size={14} aria-hidden />}
            {FORCE_LABEL[k]}
          </button>
        ))}
      </div>
      <p className="hint">{forceBlock ?? 'One-time impulse on objects within 6 units of the selected one. The selected object itself does not move.'}</p>
      <p className="hint">Throw and Push go away from the camera. Nudges follow the world axes (+X is to the right in the default view).</p>
    </div>
  )
}

export function RightPanel() {
  const count = useStore((s) => s.objects.length)
  const selectedId = useStore((s) => s.selectedId)
  const cid = useStore((s) => s.challenge?.id)
  return (
    <aside id="right-panel" className="panel right glass" aria-label="Objects">
      <section>
        <h2>Spawn</h2>
        <div className="grid2">
          <button className="btn" onClick={() => add('sphere')}><CircleDot size={14} aria-hidden /> Sphere</button>
          <button className="btn" onClick={() => add('cube')}><Box size={14} aria-hidden /> Cube</button>
          <button className="btn wide span2" onClick={() => add('sphere', true)}><Weight size={14} aria-hidden /> Heavy sphere</button>
        </div>
        <p className="count" aria-live="polite">Objects <b>{count}</b> / {MAX_OBJECTS}</p>
        <button className="btn wide danger" disabled={count === 0 || !!cid} onClick={() => { clearObjects(); say('All objects cleared.') }}>
          <Trash2 size={14} aria-hidden /> Clear objects
        </button>
      </section>
      <section>
        <h2>Selected object</h2>
        {selectedId === null ? (
          <p className="hint">Click an object, or use the buttons below. Keys: [ previous, ] next, Esc deselect.</p>
        ) : (
          <SelectedInfo id={selectedId} key={selectedId} />
        )}
        <div className="grid2" style={{ marginTop: 10 }}>
          <button className="btn" disabled={count === 0} onClick={() => selectNext(-1)}>Previous</button>
          <button className="btn" disabled={count === 0} onClick={() => selectNext(1)}>Next</button>
        </div>
        {selectedId !== null && <button className="btn wide ghost" onClick={() => select(null)}>Deselect</button>}
      </section>
    </aside>
  )
}
