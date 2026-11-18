import { Check, X } from 'lucide-react'
import { describeEffect, describeTrigger } from '../reality/describe'
import { activateDraft } from '../reality/liveHost'
import { say, setProposal, useStore } from '../store'

/** Preview of a compiled (AI) rule. Nothing runs until the user presses Activate. */
export function ProposalCard() {
  const p = useStore((s) => s.proposal)
  if (!p) return null
  const d = p.draft
  return (
    <div className="proposal" role="region" aria-label="Compiled rule preview">
      <div className="proposal-body">
        <p className="kw">COMPILED FROM “{p.input}”</p>
        <p><b>Trigger:</b> {describeTrigger(d.trigger)}</p>
        <p><b>Effect:</b> {describeEffect(d.effect)}{d.durationS ? ` for ${d.durationS}s` : ''}</p>
        <p><b>Cooldown:</b> {d.cooldownS} s</p>
        {p.notes.map((n) => <p key={n} className="meta">{n}</p>)}
      </div>
      <div className="proposal-actions">
        <button className="btn lime" autoFocus onClick={() => { const r = activateDraft(d); say(r.message, r.ok); setProposal(null) }}>
          <Check size={14} aria-hidden /> Activate rule
        </button>
        <button className="btn" onClick={() => { setProposal(null); say('Proposal dismissed.') }}>
          <X size={14} aria-hidden /> Cancel
        </button>
      </div>
    </div>
  )
}
