import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BallCollider, RigidBody } from '@react-three/rapier'
import type { Group, Mesh } from 'three'
import { getState } from '../store'
import { prefersReducedMotion } from '../util'
import { REST_NORMAL } from './SimObjectBody'

export const REACTOR_Y = 3.2
const R = 1.1

/** Decorative floating core. It is a static collider; it exerts NO gravitational pull. */
export function Reactor() {
  const ring = useRef<Group>(null)
  const core = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (getState().paused || prefersReducedMotion()) return
    if (ring.current) {
      ring.current.rotation.y += dt * 0.5
      ring.current.rotation.x += dt * 0.2
    }
    if (core.current) core.current.rotation.y += dt * 0.15
  })
  return (
    <RigidBody type="fixed" colliders={false} position={[0, REACTOR_Y, 0]}>
      <BallCollider args={[R]} restitution={REST_NORMAL} />
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
    </RigidBody>
  )
}
