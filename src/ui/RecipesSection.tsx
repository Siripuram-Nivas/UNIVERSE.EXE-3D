import { useState } from 'react'
import { Play, Plus, Trash2 } from 'lucide-react'
import { describeEffect, describeTrigger } from '../reality/describe'
import { activateDraft, deleteRule, engine } from '../reality/liveHost'
import { PRESETS } from '../reality/presets'
import { BURST_COLORS, GRAVITY_MODES, LIMITS, OBJ_KINDS, HIT_KINDS } from '../reality/types'
import { clearRules, say, toggleRule, useStore } from '../store'

function report(r: { ok: boolean; message: string }) {
  say(r.message, r.ok)
}

function Builder() {
  const [trig, setTrig] = useState<'collision' | 'activation'>('collision')
  const [a, setA] = useState('sphere')
  const [b, setB] = useState('sphere')
  const [eff, setEff] = useState('spawn')
  const [kind, setKind] = useState('sphere')
  const [at, setAt] = useState('collision')
  const [target, setTarget] = useState('a')
  const [dir, setDir] = useState('up')
  const [strength, setStrength] = useState(10)
  const [grav, setGrav] = useState('reverse')
  const [bouncy, setBouncy] = useState('true')
  const [color, setColor] = useState('orange')
  const [cooldown, setCooldown] = useState(1)
  const [duration, setDuration] = useState(0)

  const effect =
    eff === 'spawn' ? { type: 'spawn', kind, at }
    : eff === 'impulse' ? { type: 'impulse', target, direction: dir, strength }
    : eff === 'gravity' ? { type: 'gravity', mode: grav }
    : eff === 'bounciness' ? { type: 'bounciness', bouncy: bouncy === 'true' }
    : { type: 'burst', color }

  const submit = () =>
    report(activateDraft({
      trigger: trig === 'collision' ? { type: 'collision', a, b } : { type: 'activation' },
      effect,
      cooldownS: cooldown,
      ...(duration > 0 && (eff === 'gravity' || eff === 'bounciness') ? { durationS: duration } : {}),
    }))

  const sel = (id: string, label: string, value: string, set: (v: string) => void, opts: readonly string[]) => (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(e) => set(e.target.value)}>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )

  return (
    <form className="builder" onSubmit={(e) => { e.preventDefault(); submit() }} aria-label="Rule builder">
      <p className="kw">WHEN</p>
      {sel('b-trig', 'Trigger', trig, (v) => setTrig(v as 'collision' | 'activation'), ['collision', 'activation'])}
      {trig === 'collision' && (
        <div className="grid2">
          {sel('b-a', 'Object', a, setA, OBJ_KINDS)}
          {sel('b-b', 'hits', b, setB, HIT_KINDS)}
        </div>
      )}
      <p className="kw">THEN</p>
      {sel('b-eff', 'Effect', eff, setEff, ['spawn', 'impulse', 'gravity', 'bounciness', 'burst'])}
      {eff === 'spawn' && (
        <div className="grid2">
          {sel('b-kind', 'Spawn', kind, setKind, OBJ_KINDS)}
          {sel('b-at', 'Where', at, setAt, trig === 'collision' ? ['collision', 'above_center'] : ['above_center'])}
        </div>
      )}
      {eff === 'impulse' && (
        <>
          <div className="grid2">
            {sel('b-target', 'Target', trig === 'collision' ? target : 'both', setTarget, trig === 'collision' ? ['a', 'b', 'both'] : ['both'])}
            {sel('b-dir', 'Direction', dir, setDir, trig === 'collision' ? ['up', 'down', 'away'] : ['up', 'down'])}
          </div>
          <label className="field" htmlFor="b-str"><span>Strength (m/s)</span>
            <input id="b-str" type="number" min={LIMITS.strength.min} max={LIMITS.strength.max} step={0.5} value={strength} onChange={(e) => setStrength(Number(e.target.value))} />
          </label>
        </>
      )}
      {eff === 'gravity' && sel('b-grav', 'Mode', grav, setGrav, GRAVITY_MODES)}
      {eff === 'bounciness' && sel('b-bounce', 'Bouncy', bouncy, setBouncy, ['true', 'false'])}
      {eff === 'burst' && sel('b-color', 'Color', color, setColor, BURST_COLORS)}
      <div className="grid2">
        <label className="field" htmlFor="b-cd"><span>Cooldown (s)</span>
          <input id="b-cd" type="number" min={LIMITS.cooldownS.min} max={LIMITS.cooldownS.max} step={0.5} value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))} />
        </label>
        <label className="field" htmlFor="b-dur"><span>Lasts (s, 0 = forever)</span>
          <input id="b-dur" type="number" min={0} max={LIMITS.durationS.max} step={0.5} value={duration} disabled={eff !== 'gravity' && eff !== 'bounciness'} onChange={(e) => setDuration(Number(e.target.value))} />
        </label>
      </div>
      <button className="btn wide" type="submit"><Plus size={14} aria-hidden /> Add rule</button>
    </form>
  )
}

export function RecipesSection() {
  const rules = useStore((s) => s.rules)
  const active = rules.filter((r) => r.enabled).length
  return (
    <details className="recipes" open>
      <summary>
        <span>Reality recipes</span>
        <b aria-label={`${active} of ${rules.length} rules active`}>{active}/{rules.length} active</b>
      </summary>

      <h3>Presets</h3>
      <ul className="presets">
        {PRESETS.map((p) => {
          const added = rules.some((r) => r.presetId === p.presetId)
          return (
            <li key={p.presetId}>
              <div><strong>{p.label}</strong><small>{p.blurb}</small></div>
              <button className="btn" disabled={added} onClick={() => report(activateDraft(p.draft, p.presetId))}>
                {added ? 'Added' : 'Add'}
              </button>
            </li>
          )
        })}
      </ul>

      <h3>Your rules</h3>
      {rules.length === 0 && <p className="hint">No rules yet. Add a preset, use the builder, or type a sentence in the command bar.</p>}
      <ul className="rules">
        {rules.map((r) => (
          <li key={r.id} className={r.enabled ? '' : 'off'}>
            <div className="rule-head">
              <label className="toggle">
                <input type="checkbox" checked={r.enabled} onChange={() => toggleRule(r.id)} aria-label={`${r.name} enabled`} />
                <strong>{r.name}</strong>
              </label>
              <span className="rule-actions">
                {r.trigger.type === 'activation' && (
                  <button className="icon-btn" title="Run once" onClick={() => report(engine.runActivation(r))}>
                    <Play size={14} aria-hidden /><span className="sr-only">Run {r.name} once</span>
                  </button>
                )}
                <button className="icon-btn danger" title="Delete rule" onClick={() => { deleteRule(r.id); say(`Deleted rule "${r.name}".`) }}>
                  <Trash2 size={14} aria-hidden /><span className="sr-only">Delete {r.name}</span>
                </button>
              </span>
            </div>
            <p>WHEN {describeTrigger(r.trigger)}</p>
            <p>THEN {describeEffect(r.effect)}{r.durationS ? ` for ${r.durationS}s` : ''}</p>
            <p className="meta">cooldown {r.cooldownS}s</p>
          </li>
        ))}
      </ul>
      {rules.length > 0 && (
        <button className="btn wide danger" onClick={() => { clearRules(); engine.reset(); say('All rules cleared.') }}>
          <Trash2 size={14} aria-hidden /> Clear all rules
        </button>
      )}

      <h3>Rule builder</h3>
      <Builder />
    </details>
  )
}
