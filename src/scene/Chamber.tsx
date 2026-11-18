import { useMemo } from 'react'
import { BoxGeometry, EdgesGeometry } from 'three'
import { Grid } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { REST_NORMAL } from './SimObjectBody'

export const HALF = 8 // inner half-width of the chamber
export const HEIGHT = 15

/** Floor, four walls and a ceiling as fixed colliders, plus the visible platform and glass frame. */
export function Chamber() {
  const edges = useMemo(() => new EdgesGeometry(new BoxGeometry(HALF * 2, HEIGHT, HALF * 2)), [])
  const t = 0.5
  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[HALF + t, t, HALF + t]} position={[0, -t, 0]} restitution={REST_NORMAL} friction={0.8} />
        <CuboidCollider args={[t, HEIGHT / 2, HALF + t]} position={[HALF + t, HEIGHT / 2, 0]} restitution={REST_NORMAL} />
        <CuboidCollider args={[t, HEIGHT / 2, HALF + t]} position={[-HALF - t, HEIGHT / 2, 0]} restitution={REST_NORMAL} />
        <CuboidCollider args={[HALF + t, HEIGHT / 2, t]} position={[0, HEIGHT / 2, HALF + t]} restitution={REST_NORMAL} />
        <CuboidCollider args={[HALF + t, HEIGHT / 2, t]} position={[0, HEIGHT / 2, -HALF - t]} restitution={REST_NORMAL} />
        <CuboidCollider args={[HALF + t, t, HALF + t]} position={[0, HEIGHT + t, 0]} restitution={REST_NORMAL} />
      </RigidBody>

      <mesh position={[0, -0.6, 0]} receiveShadow>
        <boxGeometry args={[HALF * 2 + 1, 1.2, HALF * 2 + 1]} />
        <meshStandardMaterial color="#160D25" metalness={0.6} roughness={0.5} />
      </mesh>
      <Grid
        position={[0, 0.01, 0]}
        args={[HALF * 2, HALF * 2]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#A259FF"
        sectionSize={4}
        sectionThickness={1.2}
        sectionColor="#F5B5D2"
        fadeDistance={30}
        fadeStrength={1.5}
      />
      <lineSegments geometry={edges} position={[0, HEIGHT / 2, 0]}>
        <lineBasicMaterial color="#A259FF" transparent opacity={0.35} />
      </lineSegments>
    </>
  )
}
