import { Mic, MicOff } from 'lucide-react'
import { startMic, stopMic } from '../controls/mic'
import { setMicSensitivity, useStore } from '../store'

const LABEL = { off: 'Off', requesting: 'Waiting for permission…', on: 'Listening', denied: 'Permission denied', unavailable: 'No microphone available' } as const

export function HumanControls() {
  const status = useStore((s) => s.micStatus)
  const sens = useStore((s) => s.micSensitivity)
  const on = status === 'on'
  return (
    <section aria-label="Human controls">
      <h2>Human controls</h2>
      <button className={`btn wide ${on ? 'lime' : ''}`} aria-pressed={on} disabled={status === 'requesting'} onClick={() => (on ? stopMic() : void startMic())}>
        {on ? <MicOff size={14} aria-hidden /> : <Mic size={14} aria-hidden />} {on ? 'Disable clap control' : 'Enable clap control'}
      </button>
      <p className="hint" role="status">Microphone: <b>{LABEL[status]}</b>. Off by default. Audio is analysed in your browser only; nothing is recorded or sent.</p>
      <label className="slider">
        <span>Sensitivity <b>{sens}</b></span>
        <input type="range" min={1} max={10} step={1} value={sens} onChange={(e) => setMicSensitivity(Number(e.target.value))} />
      </label>
      <p className="hint">A clap flips gravity (normal/reverse). This is a loudness heuristic, not clap recognition; loud noises can trigger it. Blink-to-freeze is not implemented.</p>
    </section>
  )
}
