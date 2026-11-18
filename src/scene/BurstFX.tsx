import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Mesh, type MeshBasicMaterial, type PointLight } from 'three'
import { BURST_HEX, useStore } from '../store'
import { prefersReducedMotion } from '../util'
import { REACTOR_Y } from './Reactor'

const DURATION = 1.0

/** Expanding shockwave ring + light flash, triggered by reality changes. Mutates refs only (no React state per frame). */
export function BurstFX() {
  const burst = useStore((s) => s.burst)
  const ring = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)
  const t = useRef(DURATION)

  useEffect(() => {
    if (burst.id === 0 || prefersReducedMotion()) return
    t.current = 0
    ;(ring.current!.material as MeshBasicMaterial).color = new Color(BURST_HEX[burst.color])
    light.current!.color = new Color(BURST_HEX[burst.color])
  }, [burst])

  useFrame((_, dt) => {
    const r = ring.current
    const l = light.current
    if (!r || !l) return
    if (t.current >= DURATION) {
      r.visible = false
      l.intensity = 0
      return
    }
    t.current += dt
    const k = Math.min(t.current / DURATION, 1)
    r.visible = true
    r.scale.setScalar(1 + k * 15)
    ;(r.material as MeshBasicMaterial).opacity = (1 - k) * 0.8
    l.intensity = (1 - k) * 120
  })

  return (
    <group position={[0, REACTOR_Y, 0]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.9, 1, 64]} />
        <meshBasicMaterial transparent depthWrite={false} opacity={0} />
      </mesh>
      <pointLight ref={light} intensity={0} distance={30} decay={2} />
    </group>
  )
}
