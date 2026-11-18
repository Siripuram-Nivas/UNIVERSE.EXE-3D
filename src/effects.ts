/** Cheap one-way queue from game logic to the 3D spark renderer (no React state involved). */
export type SparkColor = 'orange' | 'yellow' | 'purple' | 'lime' | 'pink'
export interface SparkBurst { pos: [number, number, number]; color: SparkColor; count: number }

export const sparkQueue: SparkBurst[] = []
const MAX_PENDING = 8

export function emitSparks(pos: [number, number, number], color: SparkColor, count = 16) {
  if (sparkQueue.length < MAX_PENDING) sparkQueue.push({ pos, color, count })
}
