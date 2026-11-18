import { useState } from 'react'
import { Download, RotateCcw, Save, Trash2 } from 'lucide-react'
import { challengeNote } from '../challenges/session'
import { fireBurst, replaceWorld, say, useStore } from '../store'
import { captureWorld } from '../world/snapshot'
import { deleteSlot, readSlot, saveToWorld, SLOTS, toSave, writeSlot, type SlotRead } from '../world/save'
import { resetWorld } from '../challenges/session'

const slots = () => Array.from({ length: SLOTS }, (_, i) => readSlot(i + 1))

export function SavePanel() {
  const locked = useStore((s) => s.challenge !== null)
  const [list, setList] = useState<SlotRead[]>(slots)
  const refresh = () => setList(slots())

  const save = (n: number) => {
    const r = writeSlot(n, toSave(captureWorld(), `World ${n}`))
    say(r.ok ? `Saved world to slot ${n}.` : r.error!, r.ok)
    refresh()
  }
  const load = (n: number) => {
    const r = readSlot(n)
    if (r.status !== 'ok') return say(r.status === 'corrupt' ? `Slot ${n} is corrupted: ${r.error}` : `Slot ${n} is empty.`, false)
    replaceWorld(saveToWorld(r.save), { mode: 'sandbox', challenge: null, stash: null })
    fireBurst('purple')
    say(`Loaded slot ${n}.${r.notes.length ? ' ' + r.notes.join(' ') : ''} Velocities restored; physics sleep state is not.`)
  }
  const del = (n: number) => { deleteSlot(n); say(`Deleted slot ${n}.`); refresh() }

  return (
    <section aria-label="Universe saves">
      <h2>Universe saves</h2>
      {locked && <p className="hint">{challengeNote}</p>}
      <ul className="slots">
        {list.map((s, i) => (
          <li key={i}>
            <span>
              Slot {i + 1}
              <small>
                {s.status === 'empty' ? 'empty' : s.status === 'corrupt' ? 'corrupted' : `${s.save.objects.length} objects, ${s.save.rules.length} rules`}
              </small>
            </span>
            <span className="rule-actions">
              <button className="icon-btn" disabled={locked} title="Save here" onClick={() => save(i + 1)}><Save size={14} aria-hidden /><span className="sr-only">Save to slot {i + 1}</span></button>
              <button className="icon-btn" disabled={locked || s.status !== 'ok'} title="Load" onClick={() => load(i + 1)}><Download size={14} aria-hidden /><span className="sr-only">Load slot {i + 1}</span></button>
              <button className="icon-btn danger" disabled={s.status === 'empty'} title="Delete" onClick={() => del(i + 1)}><Trash2 size={14} aria-hidden /><span className="sr-only">Delete slot {i + 1}</span></button>
            </span>
          </li>
        ))}
      </ul>
      <button className="btn wide" onClick={() => resetWorld()}><RotateCcw size={14} aria-hidden /> Reset world</button>
    </section>
  )
}
