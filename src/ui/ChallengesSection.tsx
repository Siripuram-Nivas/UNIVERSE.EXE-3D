import { CHALLENGES } from '../challenges/defs'
import { enterChallenge } from '../challenges/session'
import { useStore } from '../store'

export function ChallengesSection() {
  const active = useStore((s) => s.challenge?.id)
  const done = useStore((s) => s.completed)
  return (
    <section aria-label="Reality challenges">
      <h2>Reality challenges</h2>
      <p className="hint">Entering a challenge saves your sandbox. Exiting restores it.</p>
      <ul className="cards">
        {CHALLENGES.map((c, i) => (
          <li key={c.id} className={active === c.id ? 'on' : ''}>
            <div><b>{i + 1}. {c.title}</b>{done.includes(c.id) && <em> solved</em>}<small>{c.objective}</small></div>
            <button className="btn" onClick={() => enterChallenge(c.id)}>{active === c.id ? 'Restart' : 'Play'}</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
