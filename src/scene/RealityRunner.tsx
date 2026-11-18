import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { engine } from '../reality/liveHost'
import { useStore } from '../store'

/** Drives the rule engine from the render loop. No React state is touched per frame. */
export function RealityRunner() {
  const resetCount = useStore((s) => s.resetCount)
  useEffect(() => { engine.reset() }, [resetCount])
  useFrame((_, dt) => engine.advance(dt))
  return null
}
