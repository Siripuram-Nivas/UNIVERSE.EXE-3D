import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { bodies } from '../physicsRegistry'
import { getState } from '../store'
import { prefersReducedMotion } from '../util'

/** A pink orbit ring that follows the selected body. Reads the live Rapier body each frame; no React state. */
export function SelectionRing() {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const id = getState().selectedId
    const b = id === null ? undefined : bodies.get(id)
    if (!b) { m.visible = false; return }
    const p = b.translation()
    m.visible = true
    m.position.set(p.x, p.y, p.z)
    if (!prefersReducedMotion()) { m.rotation.x = Math.PI / 2 + Math.sin(clock.elapsedTime * 2) * 0.3; m.rotation.z = clock.elapsedTime * 1.5 }
  })
  return (
    <mesh ref={ref} visible={false}>
      <torusGeometry args={[0.85, 0.025, 8, 48]} />
      <meshBasicMaterial color="#F5B5D2" transparent opacity={0.85} depthWrite={false} />
    </mesh>
  )
}
