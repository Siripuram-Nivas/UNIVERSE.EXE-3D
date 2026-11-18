import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute } from 'three'
import { sparkQueue, type SparkColor } from '../effects'
import { getState } from '../store'
import { prefersReducedMotion } from '../util'

const N = 96
const LIFE = 0.9
const HEX: Record<SparkColor, string> = { orange: '#FF5A1F', yellow: '#FFD83D', purple: '#A259FF', lime: '#B7FF2A', pink: '#F5B5D2' }
const c = new Color()

/** One shared pool of 96 additive points. Bursts come from real events (rule fired, goal reached, level start). */
export function Sparks() {
  const d = useMemo(() => {
    const pos = new Float32Array(N * 3).fill(0)
    for (let i = 0; i < N; i++) pos[i * 3 + 1] = -100
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
    geo.setAttribute('color', new Float32BufferAttribute(new Float32Array(N * 3), 3))
    return { geo, vel: new Float32Array(N * 3), life: new Float32Array(N), base: new Float32Array(N * 3), next: 0 }
  }, [])

  useFrame((_, dt) => {
    if (prefersReducedMotion()) { sparkQueue.length = 0; return }
    if (getState().paused) return
    const P = d.geo.attributes.position
    const C = d.geo.attributes.color
    while (sparkQueue.length) {
      const b = sparkQueue.shift()!
      c.set(HEX[b.color])
      for (let k = 0; k < Math.min(b.count, 48); k++) {
        const i = d.next++ % N
        const th = Math.random() * Math.PI * 2
        const ph = Math.acos(2 * Math.random() - 1)
        const sp = 1.5 + Math.random() * 3.5
        P.setXYZ(i, b.pos[0], b.pos[1], b.pos[2])
        d.vel[i * 3] = Math.sin(ph) * Math.cos(th) * sp
        d.vel[i * 3 + 1] = Math.cos(ph) * sp + 1
        d.vel[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * sp
        d.base.set([c.r, c.g, c.b], i * 3)
        d.life[i] = LIFE
      }
    }
    const step = Math.min(dt, 0.05)
    for (let i = 0; i < N; i++) {
      if (d.life[i] <= 0) continue
      d.life[i] -= step
      if (d.life[i] <= 0) { P.setY(i, -100); continue }
      d.vel[i * 3 + 1] -= 5 * step
      P.setXYZ(i, P.getX(i) + d.vel[i * 3] * step, P.getY(i) + d.vel[i * 3 + 1] * step, P.getZ(i) + d.vel[i * 3 + 2] * step)
      const f = d.life[i] / LIFE
      C.setXYZ(i, d.base[i * 3] * f, d.base[i * 3 + 1] * f, d.base[i * 3 + 2] * f)
    }
    P.needsUpdate = true
    C.needsUpdate = true
  })

  return (
    <points geometry={d.geo} frustumCulled={false}>
      <pointsMaterial size={0.2} vertexColors transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  )
}
