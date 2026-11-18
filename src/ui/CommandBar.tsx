import { useRef, useState } from 'react'
import { CornerDownLeft, Loader2, Sparkles, X } from 'lucide-react'
import { runCommand, SUGGESTIONS } from '../commands'
import { compileText } from '../reality/compiler'
import { fireBurst, say, setAiStatus, setCompiling, setProposal, useStore } from '../store'
import { ProposalCard } from './ProposalCard'

export function CommandBar() {
  const [text, setText] = useState('')
  const fb = useStore((s) => s.feedback)
  const compiling = useStore((s) => s.compiling)
  const ai = useStore((s) => s.aiStatus)
  const abort = useRef<AbortController | null>(null)

  const compile = async (input: string) => {
    const ctrl = new AbortController()
    abort.current = ctrl
    setCompiling(true)
    say('Compiling your sentence into a physics rule…')
    const r = await compileText(input, { signal: ctrl.signal })
    abort.current = null
    setCompiling(false)
    if (r.status === 'rule') {
      setProposal({ input, draft: r.draft, notes: r.notes })
      fireBurst('purple')
      say('Compiled. Review the rule, then activate it.')
    } else {
      if (r.status === 'unavailable') setAiStatus('unavailable')
      say(r.reason, false)
    }
  }

  const submit = (value: string) => {
    if (compiling) return
    const r = runCommand(value)
    setText('')
    if (!r.unmatched) return
    if (ai === 'ready') void compile(value.trim())
    else say(`${r.message} AI compilation is unavailable (not configured), but Reality Recipes work without it.`, false)
  }

  return (
    <footer className="cmdbar glass">
      <ProposalCard />
      <form onSubmit={(e) => { e.preventDefault(); submit(text) }}>
        <label htmlFor="cmd" className="cmd-label">
          REALITY COMMAND <em>exact commands run locally · other sentences go to the AI compiler {ai === 'ready' ? '(ready)' : ai === 'unknown' ? '(checking…)' : '(not configured)'}</em>
        </label>
        <div className="cmd-row">
          <span aria-hidden className="prompt">&gt;</span>
          <input
            id="cmd" value={text} onChange={(e) => setText(e.target.value)}
            placeholder='try "reverse gravity"' autoComplete="off" spellCheck={false}
            list="cmd-list" maxLength={200} disabled={compiling}
          />
          <datalist id="cmd-list">{SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
          {compiling ? (
            <button className="btn" type="button" onClick={() => abort.current?.abort()}>
              <Loader2 size={14} className="spin" aria-hidden /> Cancel <X size={14} aria-hidden />
            </button>
          ) : (
            <button className="btn accent" type="submit">Execute <CornerDownLeft size={14} aria-hidden /></button>
          )}
        </div>
      </form>
      <div className="chips" role="group" aria-label="Supported commands">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="chip" disabled={compiling} onClick={() => submit(s)}>{s}</button>
        ))}
        {ai === 'ready' && <span className="chip ai"><Sparkles size={11} aria-hidden /> AI compiler ready</span>}
      </div>
      <p key={fb.id} className={`feedback ${fb.ok ? 'ok' : 'err'}`} role="status" aria-live="polite">{fb.text}</p>
    </footer>
  )
}
