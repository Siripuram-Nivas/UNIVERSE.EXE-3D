import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { BallCollider, RigidBody } from '@react-three/rapier'
import { Color, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import { BURST_HEX, getState } from '../store'
import { prefersReducedMotion } from '../util'
import { REST_NORMAL } from './SimObjectBody'

export const REACTOR_Y = 3.2
const R = 1.1
const BASE = new Color('#A259FF')
const tmp = new Color()

function ReactorVisual() {
  const ring = useRef<Group>(null)
  const core = useRef<Mesh>(null)
  const pulse = useRef({ id: 0, v: 0, color: new Color('#FF5A1F') })
  useFrame((_, dt) => {
    const s = getState()
    if (s.paused || prefersReducedMotion()) return
    if (ring.current) {
      ring.current.rotation.y += dt * 0.5
      ring.current.rotation.x += dt * 0.2
    }
    if (core.current) core.current.rotation.y += dt * 0.15
    // Energy pulse: every reality change (burst event) makes the core flare in that event's colour.
    const p = pulse.current
    if (s.burst.id !== p.id) { p.id = s.burst.id; p.v = 1; p.color.set(BURST_HEX[s.burst.color]) }
    if (core.current) {
      const m = core.current.material as MeshStandardMaterial
      p.v = Math.max(0, p.v - dt * 1.6)
      m.emissive.copy(BASE).lerp(tmp.copy(p.color), p.v)
      m.emissiveIntensity = 0.9 + p.v * 1.6
      core.current.scale.setScalar(1 + p.v * 0.06)
    }
  })
  return (
    <>
      <mesh ref={core}>
        <icosahedronGeometry args={[R, 3]} />
        <meshStandardMaterial color="#240D42" emissive="#A259FF" emissiveIntensity={0.9} metalness={0.4} roughness={0.35} flatShading />
      </mesh>
      <mesh scale={1.35}>
        <sphereGeometry args={[R, 24, 16]} />
        <meshBasicMaterial color="#A259FF" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <group ref={ring}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R * 1.7, 0.03, 8, 96]} />
          <meshBasicMaterial color="#F5B5D2" />
        </mesh>
        <mesh>
          <torusGeometry args={[R * 2.0, 0.02, 8, 96]} />
          <meshBasicMaterial color="#A259FF" />
        </mesh>
      </group>
      <pointLight color="#A259FF" intensity={25} distance={16} decay={2} />
    </>
  )
}

function Wrap({ solid, children }: { solid: boolean; children: ReactNode }) {
  return solid ? (
    <RigidBody type="fixed" colliders={false} position={[0, REACTOR_Y, 0]}>
      <BallCollider args={[R]} restitution={REST_NORMAL} />
      {children}
    </RigidBody>
  ) : (
    <group position={[0, REACTOR_Y, 0]}>{children}</group>
  )
}

/** Decorative floating core. In the sandbox it is a static collider; during challenges it is visual only so it cannot block a puzzle. It exerts NO gravitational pull. */
export function Reactor({ solid = true }: { solid?: boolean }) {
  return (
    <Wrap solid={solid}>
      <ReactorVisual />
    </Wrap>
  )
}
