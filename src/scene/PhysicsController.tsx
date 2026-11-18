import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { gravityVector, getState, useStore } from '../store'
import { HALF, HEIGHT } from './Chamber'
import { REST_BOUNCY, REST_NORMAL } from './SimObjectBody'

/** Keeps the Rapier world in sync with app state: wakes sleeping bodies, applies bounciness, rescues escapees. */
export function PhysicsController() {
  const { world } = useRapier()
  const gm = useStore((s) => s.gravityMode)
  const mag = useStore((s) => s.gravityMagnitude)
  const paused = useStore((s) => s.paused)
  const frame = useRef(0)

  useEffect(() => {
    const [x, y, z] = gravityVector({ gravityMode: gm, gravityMagnitude: mag })
    world.gravity = { x, y, z }
    world.forEachRigidBody((b) => b.wakeUp())
  }, [world, gm, mag])

  useEffect(() => {
    if (!paused) world.forEachRigidBody((b) => b.wakeUp())
  }, [world, paused])

  useFrame(() => {
    if (++frame.current % 12) return
    const rest = getState().bouncy ? REST_BOUNCY : REST_NORMAL
    world.forEachCollider((c) => {
      if (c.restitution() !== rest) c.setRestitution(rest)
    })
    // Safety net: put anything that tunnelled out of the chamber back inside.
    const lim = HALF + 1
    world.forEachRigidBody((b) => {
      if (!b.isDynamic()) return
      const p = b.translation()
      if (Math.abs(p.x) > lim || Math.abs(p.z) > lim || p.y < -2 || p.y > HEIGHT + 1) {
        b.setTranslation({ x: 0, y: 8, z: 0 }, true)
        b.setLinvel({ x: 0, y: 0, z: 0 }, true)
      }
    })
  })
  return null
}
