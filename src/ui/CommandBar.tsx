import { useState } from 'react'
import { CornerDownLeft } from 'lucide-react'
import { runCommand, SUGGESTIONS } from '../commands'
import { useStore } from '../store'

export function CommandBar() {
  const [text, setText] = useState('')
  const fb = useStore((s) => s.feedback)

  const submit = (value: string) => {
    runCommand(value)
    setText('')
  }

  return (
    <footer className="cmdbar glass">
      <form onSubmit={(e) => { e.preventDefault(); submit(text) }}>
        <label htmlFor="cmd" className="cmd-label">
          REALITY COMMAND <em>supported-command interpreter · not an AI model</em>
        </label>
        <div className="cmd-row">
          <span aria-hidden className="prompt">&gt;</span>
          <input
            id="cmd" value={text} onChange={(e) => setText(e.target.value)}
            placeholder='try "reverse gravity"' autoComplete="off" spellCheck={false}
            list="cmd-list"
          />
          <datalist id="cmd-list">{SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
          <button className="btn accent" type="submit">Execute <CornerDownLeft size={14} aria-hidden /></button>
        </div>
      </form>
      <div className="chips" role="group" aria-label="Supported commands">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="chip" onClick={() => submit(s)}>{s}</button>
        ))}
      </div>
      <p key={fb.id} className={`feedback ${fb.ok ? 'ok' : 'err'}`} role="status" aria-live="polite">{fb.text}</p>
    </footer>
  )
}
