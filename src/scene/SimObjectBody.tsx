import { memo, useEffect, useState } from 'react'
import { BallCollider, CuboidCollider, RigidBody } from '@react-three/rapier'
import { bodies } from '../physicsRegistry'
import { engine } from '../reality/liveHost'
import { getState, select, useStore, type SimObject } from '../store'

export const REST_NORMAL = 0.3
export const REST_BOUNCY = 0.92

function SimObjectBodyImpl({ obj }: { obj: SimObject }) {
  const selected = useStore((s) => s.selectedId === obj.id)
  const { id, kind, heavy } = obj
  useEffect(() => () => { document.body.style.cursor = '' }, [])
  const [rotation] = useState<[number, number, number]>(() => [Math.random() * 3, Math.random() * 3, 0])
  const size = kind === 'sphere' ? (heavy ? 0.7 : 0.45) : heavy ? 0.9 : 0.7
  const density = heavy ? 6 : 1
  const restitution = getState().bouncy ? REST_BOUNCY : REST_NORMAL
  const base = kind === 'sphere' ? (heavy ? '#240D42' : '#A259FF') : heavy ? '#3a1466' : '#F5B5D2'
  const emissive = selected ? '#B7FF2A' : heavy ? '#A259FF' : '#000000'

  return (
    <RigidBody
      ref={(r) => {
        if (r) bodies.set(id, r)
        else bodies.delete(id)
      }}
      position={obj.pos}
      rotation={rotation}
      linearDamping={0.05}
      angularDamping={0.2}
      ccd
      userData={{ kind, id }}
      onCollisionEnter={({ target, other }) => {
        // Cheap by design: bail out when no collision rules are active; the engine queues the rest.
        if (!getState().rules.length) return
        const ud = other.rigidBodyObject?.userData as { kind?: string; id?: number } | undefined
        const otherKind = ud?.kind === 'floor' || ud?.kind === 'sphere' || ud?.kind === 'cube' ? ud.kind : null
        if (!otherKind || !target.rigidBody) return
        if (otherKind !== 'floor' && typeof ud?.id !== 'number') return
        const p = target.rigidBody.translation()
        const q = otherKind === 'floor' ? p : (other.rigidBody?.translation() ?? p)
        engine.enqueueCollision({
          a: { id, kind },
          b: { id: otherKind === 'floor' ? null : ud!.id!, kind: otherKind },
          pos: [(p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2],
        })
      }}
    >
      {kind === 'sphere' ? (
        <BallCollider args={[size]} density={density} restitution={restitution} friction={0.6} />
      ) : (
        <CuboidCollider args={[size / 2, size / 2, size / 2]} density={density} restitution={restitution} friction={0.6} />
      )}
      <mesh
        castShadow
        onClick={(e) => {
          e.stopPropagation()
          select(id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        {kind === 'sphere' ? <sphereGeometry args={[size, 32, 24]} /> : <boxGeometry args={[size, size, size]} />}
        <meshStandardMaterial
          color={base}
          emissive={emissive}
          emissiveIntensity={selected ? 0.9 : heavy ? 0.35 : 1}
          metalness={heavy ? 0.8 : 0.25}
          roughness={heavy ? 0.3 : 0.45}
        />
      </mesh>
    </RigidBody>
  )
}

export const SimObjectBody = memo(SimObjectBodyImpl)
