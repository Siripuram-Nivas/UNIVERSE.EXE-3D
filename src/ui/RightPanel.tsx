import { useEffect, useState } from 'react'
import { ArrowUpFromLine, Box, CircleDot, Crosshair, Move, Rotate3d, Trash2, Weight } from 'lucide-react'
import { bodies, pushBody, type PushKind } from '../physicsRegistry'
import { clearObjects, fireBurst, MAX_OBJECTS, say, select, spawn, useStore, type Kind } from '../store'

function add(kind: Kind, heavy = false) {
  if (!spawn(kind, heavy)) say(`Object cap reached (${MAX_OBJECTS}). Clear some objects first.`, false)
  else {
    fireBurst('yellow')
    say(`Spawned a ${heavy ? 'heavy ' : ''}${kind}.`)
  }
}

function SelectedInfo({ id }: { id: number }) {
  const obj = useStore((s) => s.objects.find((o) => o.id === id))
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
    <button className="btn" onClick={() => { pushBody(id, kind); fireBurst('orange'); say(`${label} applied to #${id}.`) }}>
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
      </div>
      <p className="hint">Throw and Push go away from the camera.</p>
    </div>
  )
}

export function RightPanel() {
  const count = useStore((s) => s.objects.length)
  const selectedId = useStore((s) => s.selectedId)
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
        <button className="btn wide danger" disabled={count === 0} onClick={() => { clearObjects(); say('All objects cleared.') }}>
          <Trash2 size={14} aria-hidden /> Clear objects
        </button>
      </section>
      <section>
        <h2>Selected object</h2>
        {selectedId === null ? (
          <p className="hint">Click an object in the chamber to select it.</p>
        ) : (
          <SelectedInfo id={selectedId} key={selectedId} />
        )}
        {selectedId !== null && <button className="btn wide ghost" onClick={() => select(null)}>Deselect</button>}
      </section>
    </aside>
  )
}
