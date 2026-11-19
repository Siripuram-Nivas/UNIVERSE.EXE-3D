import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, Float32BufferAttribute, type Group, type Mesh, type MeshBasicMaterial, type Points } from 'three'
import { forceFxQueue, type ForceFx } from '../effects'
import { getState } from '../store'
import { prefersReducedMotion } from '../util'

const DURATION = 0.7
const R = 6 // matches FORCE.radius, the real reach of the impulse
const DOTS = 14

interface Slot { fx: ForceFx; t: number }

/**
 * Short pulses at the selected object, started only after Force Lab really applied an impulse.
 * Shockwave: orange ring + shell expanding to the real radius. Implosion: purple ring contracting. Vortex: violet ring with orbiting points.
 * Mutates refs only. Three meshes, one 14-point cloud, no particle system.
 */
export function ForceFX() {
  const group = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const shell = useRef<Mesh>(null)
  const dots = useRef<Points>(null)
  const slot = useRef<Slot | null>(null)
  const geo = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(DOTS * 3), 3))
    return g
  }, [])
  useEffect(() => () => geo.dispose(), [geo])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    if (prefersReducedMotion()) { forceFxQueue.length = 0; g.visible = false; slot.current = null; return }
    const next = forceFxQueue.shift()
    if (next) slot.current = { fx: next, t: 0 }
    const s = slot.current
    if (!s) { g.visible = false; return }
    if (!getState().paused) s.t += dt
    const k = Math.min(s.t / DURATION, 1)
    if (k >= 1) { slot.current = null; g.visible = false; return }
    g.visible = true
    g.position.set(...s.fx.pos)
    const kind = s.fx.kind
    const scale = kind === 'implosion' ? R * (1 - k) + 0.5 : 0.5 + R * k
    const color = kind === 'shockwave' ? '#FF5A1F' : '#A259FF'
    const fade = 1 - k
    const rm = ring.current!.material as MeshBasicMaterial
    const sm = shell.current!.material as MeshBasicMaterial
    rm.color.set(color); sm.color.set(kind === 'shockwave' ? '#FFD83D' : color)
    ring.current!.scale.setScalar(scale)
    rm.opacity = fade * 0.9
    shell.current!.visible = kind !== 'vortex'
    shell.current!.scale.setScalar(scale)
    sm.opacity = fade * 0.12
    const d = dots.current!
    d.visible = kind === 'vortex'
    if (kind === 'vortex') {
      const a = geo.attributes.position
      for (let i = 0; i < DOTS; i++) {
        const ang = (i / DOTS) * Math.PI * 2 + k * 5
        const r = scale * (0.6 + 0.4 * ((i % 3) / 2))
        a.setXYZ(i, Math.cos(ang) * r, k * 1.5 * (i % 2), -Math.sin(ang) * r)
      }
      a.needsUpdate = true
      ;(d.material as MeshBasicMaterial).opacity = fade
    }
  })

  return (
    <group ref={group} visible={false}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1, 64]} />
        <meshBasicMaterial transparent depthWrite={false} />
      </mesh>
      <mesh ref={shell}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial transparent depthWrite={false} />
      </mesh>
      <points ref={dots} geometry={geo} frustumCulled={false} visible={false}>
        <pointsMaterial color="#F5B5D2" size={0.16} transparent depthWrite={false} />
      </points>
    </group>
  )
}
