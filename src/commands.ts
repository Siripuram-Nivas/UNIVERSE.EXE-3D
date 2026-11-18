import {
  resetUniverse,
  say,
  setBouncy,
  setGravityMode,
  setPaused,
  spawn,
  fireBurst,
  MAX_OBJECTS,
} from './store'

export interface CommandResult {
  ok: boolean
  message: string
  /** True when no deterministic command matched (the caller may offer AI compilation). */
  unmatched?: boolean
}

interface Command {
  name: string
  aliases?: string[]
  run: () => CommandResult
}

const ok = (message: string): CommandResult => ({ ok: true, message })

function doSpawn(kind: 'sphere' | 'cube'): CommandResult {
  if (!spawn(kind)) return { ok: false, message: `Object cap reached (${MAX_OBJECTS}). Clear some objects first.` }
  fireBurst('yellow')
  return ok(`Spawned a ${kind}.`)
}

export const COMMANDS: Command[] = [
  {
    name: 'reverse gravity',
    aliases: ['invert gravity', 'gravity up'],
    run: () => {
      setGravityMode('reverse')
      return ok('Gravity reversed. Objects now fall upward.')
    },
  },
  {
    name: 'zero gravity',
    aliases: ['no gravity', 'zero g', 'disable gravity'],
    run: () => {
      setGravityMode('zero')
      return ok('Gravity disabled. Objects drift freely.')
    },
  },
  {
    name: 'normal gravity',
    aliases: ['restore gravity', 'gravity down'],
    run: () => {
      setGravityMode('normal')
      return ok('Normal gravity restored.')
    },
  },
  {
    name: 'freeze time',
    aliases: ['pause time', 'pause'],
    run: () => {
      setPaused(true)
      return ok('Time frozen. Positions are preserved.')
    },
  },
  {
    name: 'resume time',
    aliases: ['unfreeze time', 'resume', 'unfreeze'],
    run: () => {
      setPaused(false)
      return ok('Time resumed.')
    },
  },
  { name: 'spawn sphere', aliases: ['spawn ball'], run: () => doSpawn('sphere') },
  { name: 'spawn cube', aliases: ['spawn box'], run: () => doSpawn('cube') },
  {
    name: 'make everything bouncy',
    aliases: ['make everything bounce', 'bouncy'],
    run: () => {
      setBouncy(true)
      return ok('Restitution raised on every body. Everything is bouncy.')
    },
  },
  {
    name: 'reset universe',
    aliases: ['reset'],
    run: () => {
      resetUniverse()
      return ok('Universe reset to its initial state.')
    },
  },
]

export const SUGGESTIONS = COMMANDS.map((c) => c.name)

/** Deterministic phrase matcher. This is NOT an AI model. */
export function runCommand(input: string): CommandResult {
  const text = input.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return { ok: false, message: 'Type a command, e.g. "reverse gravity".' }
  const cmd = COMMANDS.find((c) => c.name === text || c.aliases?.includes(text))
  const result: CommandResult = cmd
    ? cmd.run()
    : {
        ok: false,
        message: `Unsupported command "${input.trim()}". Available: ${SUGGESTIONS.join(', ')}.`,
        unmatched: text.length > 0,
      }
  say(result.message, result.ok)
  return result
}
