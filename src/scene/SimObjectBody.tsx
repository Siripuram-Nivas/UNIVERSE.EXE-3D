import { memo, useState } from 'react'
import { BallCollider, CuboidCollider, RigidBody } from '@react-three/rapier'
import { bodies } from '../physicsRegistry'
import { getState, select, useStore, type SimObject } from '../store'

export const REST_NORMAL = 0.3
export const REST_BOUNCY = 0.92

function SimObjectBodyImpl({ obj }: { obj: SimObject }) {
  const selected = useStore((s) => s.selectedId === obj.id)
  const { id, kind, heavy } = obj
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
