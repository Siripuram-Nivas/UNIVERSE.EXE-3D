import type { Effect, Rule, RuleDraft, Trigger } from './types.js'

export function describeTrigger(t: Trigger): string {
  if (t.type === 'activation') return 'Once, when the rule is activated'
  if (t.b === 'floor') return `${t.a} hits the floor`
  return `${t.a} collides with ${t.b}`
}

export function describeEffect(e: Effect): string {
  switch (e.type) {
    case 'spawn':
      return e.at === 'collision' ? `spawn a ${e.kind} at the impact` : `spawn a ${e.kind} above the center`
    case 'impulse': {
      const who = e.target === 'both' ? 'both objects' : e.target === 'a' ? 'the first object' : 'the second object'
      return `push ${who} ${e.direction} (${e.strength} m/s)`
    }
    case 'gravity':
      return `set gravity to ${e.mode}`
    case 'bounciness':
      return e.bouncy ? 'make everything bouncy' : 'restore normal bounce'
    case 'burst':
      return `emit a ${e.color} energy burst (visual only)`
  }
}

export const describeRule = (r: RuleDraft | Rule) =>
  `WHEN ${describeTrigger(r.trigger)} THEN ${describeEffect(r.effect)}` +
  (r.durationS ? ` for ${r.durationS}s` : '')
