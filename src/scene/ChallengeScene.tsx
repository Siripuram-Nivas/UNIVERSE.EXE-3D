import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BallCollider, CuboidCollider, RigidBody } from '@react-three/rapier'
import { AdditiveBlending, BoxGeometry, BufferGeometry, Float32BufferAttribute, type Group, type Points } from 'three'
import { getChallenge, type Block } from '../challenges/defs'
import { challengeEvent, getState, useStore } from '../store'
import { prefersReducedMotion } from '../util'
import { REST_NORMAL } from './SimObjectBody'

const edgesSource = (size: [number, number, number]) => new BoxGeometry(...size)

function BlockMesh({ b }: { b: Block }) {
  return (
    <RigidBody type="fixed" colliders={false} position={b.pos}>
      <CuboidCollider args={[b.size[0] / 2, b.size[1] / 2, b.size[2] / 2]} restitution={REST_NORMAL} friction={0.6} />
      <mesh>
        <boxGeometry args={b.size} />
        <meshStandardMaterial color="#240D42" emissive="#A259FF" emissiveIntensity={0.18} metalness={0.5} roughness={0.5} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[edgesSource(b.size)]} />
        <lineBasicMaterial color="#F5B5D2" transparent opacity={0.55} />
      </lineSegments>
    </RigidBody>
  )
}

const DOTS = 16
/** Glowing energy ring. Completion comes only from a Rapier sensor intersection with the tagged object. */
function GoalZone({ pos, radius }: { pos: [number, number, number]; radius: number }) {
  const done = useStore((s) => s.challenge?.status === 'complete')
  const ring = useRef<Group>(null)
  const dots = useRef<Points>(null)
  const geo = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(DOTS * 3), 3))
    return g
  }, [])
  useFrame(({ clock }) => {
    if (getState().paused || prefersReducedMotion()) return
    const t = clock.elapsedTime
    if (ring.current) { ring.current.rotation.z = t * 0.6; ring.current.scale.setScalar(1 + Math.sin(t * 2) * 0.03) }
    const a = geo.attributes.position
    for (let i = 0; i < DOTS; i++) {
      const ang = t * 0.8 + (i / DOTS) * Math.PI * 2
      const r = radius * (0.55 + 0.3 * Math.sin(t * 1.3 + i))
      a.setXYZ(i, Math.cos(ang) * r, Math.sin(t * 1.1 + i * 1.7) * radius * 0.5, Math.sin(ang) * r)
    }
    a.needsUpdate = true
  })
  const color = done ? '#B7FF2A' : '#F5B5D2'
  return (
    <RigidBody type="fixed" colliders={false} position={pos}>
      <BallCollider
        args={[radius]}
        sensor
        onIntersectionEnter={({ other }) => {
          const ud = other.rigidBodyObject?.userData as { id?: number; tag?: string } | undefined
          if (typeof ud?.id === 'number') challengeEvent({ type: 'goal', tag: ud.tag })
        }}
      />
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[radius, 0.07, 12, 72]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 0.95, 0.03, 8, 72]} />
          <meshBasicMaterial color="#A259FF" />
        </mesh>
      </group>
      <mesh>
        <sphereGeometry args={[radius, 24, 16]} />
        <meshBasicMaterial color={color} transparent opacity={done ? 0.22 : 0.09} depthWrite={false} />
      </mesh>
      <points ref={dots} geometry={geo} frustumCulled={false}>
        <pointsMaterial color={color} size={0.14} transparent opacity={0.9} depthWrite={false} blending={AdditiveBlending} />
      </points>
      <pointLight color={color} intensity={done ? 60 : 22} distance={14} decay={2} />
    </RigidBody>
  )
}

/** Static scenery + goal for the active challenge (rebuilt whenever the world epoch changes). */
export function ChallengeScene() {
  const id = useStore((s) => s.challenge?.id)
  const def = id ? getChallenge(id) : undefined
  if (!def) return null
  return (
    <>
      {def.blocks.map((b, i) => <BlockMesh key={i} b={b} />)}
      {def.goal && <GoalZone pos={def.goal.pos} radius={def.goal.radius} />}
    </>
  )
}
