import type { RapierRigidBody } from '@react-three/rapier'

/** id -> live Rapier body, so UI actions can push real bodies without React state churn. */
export const bodies = new Map<number, RapierRigidBody>()

/** Camera forward direction (unit, written each frame by the scene). */
export const cameraForward = { x: 0, y: 0, z: -1 }

export type PushKind = 'throw' | 'push' | 'launch' | 'spin'

export function pushBody(id: number, kind: PushKind): boolean {
  const b = bodies.get(id)
  if (!b) return false
  b.wakeUp()
  const m = b.mass()
  const len = Math.hypot(cameraForward.x, cameraForward.z) || 1
  const fx = cameraForward.x / len
  const fz = cameraForward.z / len
  switch (kind) {
    case 'throw':
      b.applyImpulse({ x: fx * m * 12, y: m * 7, z: fz * m * 12 }, true)
      break
    case 'push':
      b.applyImpulse({ x: fx * m * 6, y: 0, z: fz * m * 6 }, true)
      break
    case 'launch':
      b.applyImpulse({ x: 0, y: m * 14, z: 0 }, true)
      break
    case 'spin':
      b.applyTorqueImpulse({ x: m * 3, y: m * 4, z: m * 2 }, true)
      break
  }
  return true
}
