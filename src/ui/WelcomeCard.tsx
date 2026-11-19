import { useState } from 'react'
import { Flame, Swords } from 'lucide-react'
import { switchMode } from '../challenges/session'
import { enterBreak } from '../demo/session'
import { useStore } from '../store'

const KEY = 'universe-exe:welcomed'
const seen = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }
const mark = () => { try { localStorage.setItem(KEY, '1') } catch { /* storage unavailable */ } }

/** First visit only. Appears once the 3D world is ready; every button leads somewhere real. */
export function WelcomeCard() {
  const ready = useStore((s) => s.ready)
  const busy = useStore((s) => s.session !== null || s.challenge !== null || s.sharedPreview !== null)
  const [open, setOpen] = useState(() => !seen())
  if (!open || !ready || busy) return null
  const close = () => { mark(); setOpen(false) }
  return (
    <div className="welcome glass" role="dialog" aria-label="Welcome to UNIVERSE.EXE">
      <h2>You are inside a physics lab.</h2>
      <p>Change gravity, freeze time, write rules. Try breaking reality in 10 seconds.</p>
      <div className="solved-actions">
        <button className="btn accent big" autoFocus onClick={() => { close(); enterBreak() }}><Flame size={16} aria-hidden /> Break Reality</button>
        <button className="btn" onClick={() => { close(); switchMode('challenges') }}><Swords size={14} aria-hidden /> Challenges</button>
        <button className="btn" onClick={close}>Explore</button>
      </div>
    </div>
  )
}
