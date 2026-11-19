import { Suspense, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { Vector3 } from 'three'
import { cameraForward } from '../physicsRegistry'
import { gravityVector, select, setReady, useStore } from '../store'
import { BurstFX } from './BurstFX'
import { ForceFX } from './ForceFX'
import { Chamber } from './Chamber'
import { PhysicsController } from './PhysicsController'
import { RealityRunner } from './RealityRunner'
import { ChallengeScene } from './ChallengeScene'
import { SelectionRing } from './SelectionRing'
import { Sparks } from './Sparks'
import { Reactor } from './Reactor'
import { SimObjectBody } from './SimObjectBody'
import { prefersReducedMotion } from '../util'

const tmp = new Vector3()
function CameraSync() {
  const camera = useThree((s) => s.camera)
  useFrame(() => {
    camera.getWorldDirection(tmp)
    cameraForward.x = tmp.x
    cameraForward.y = tmp.y
    cameraForward.z = tmp.z
  })
  return null
}

function Objects() {
  const objects = useStore((s) => s.objects)
  useEffect(() => {
    setReady()
  }, [])
  return (
    <>
      {objects.map((o) => (
        <SimObjectBody key={o.id} obj={o} />
      ))}
    </>
  )
}

function World() {
  const gm = useStore((s) => s.gravityMode)
  const mag = useStore((s) => s.gravityMagnitude)
  const paused = useStore((s) => s.paused)
  const epoch = useStore((s) => s.epoch)
  const inChallenge = useStore((s) => s.challenge !== null)
  return (
    <Physics gravity={gravityVector({ gravityMode: gm, gravityMagnitude: mag })} paused={paused}>
      <PhysicsController />
      <RealityRunner />
      <Chamber />
      <Reactor solid={!inChallenge} />
      <ChallengeScene key={`c${epoch}`} />
      <Objects key={`o${epoch}`} />
      <SelectionRing />
      <Sparks />
      <BurstFX />
      <ForceFX />
    </Physics>
  )
}

export function Scene() {
  const paused = useStore((s) => s.paused)
  const low = useStore((s) => s.lowQuality)
  return (
    <Canvas
      camera={{ position: [14, 9, 16], fov: 50, near: 0.1, far: 200 }}
      dpr={low ? 0.75 : [1, 1.75]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => select(null)}
      aria-label="3D physics chamber. Drag to orbit, scroll to zoom, click an object to select it."
    >
      <color attach="background" args={['#08060E']} />
      <fog attach="fog" args={['#08060E', 30, 90]} />
      <ambientLight intensity={0.35} color="#B9A9CC" />
      <directionalLight position={[8, 16, 6]} intensity={1.1} color="#F5B5D2" />
      <pointLight position={[-10, 6, -8]} intensity={60} color="#A259FF" distance={40} />
      <Stars radius={90} depth={50} count={2500} factor={4} saturation={0.4} fade speed={paused || prefersReducedMotion() ? 0 : 0.6} />
      <OrbitControls makeDefault enableDamping target={[0, 4, 0]} minDistance={5} maxDistance={45} maxPolarAngle={Math.PI * 0.92} />
      <CameraSync />
      <Suspense fallback={null}>
        <World />
      </Suspense>
    </Canvas>
  )
}
