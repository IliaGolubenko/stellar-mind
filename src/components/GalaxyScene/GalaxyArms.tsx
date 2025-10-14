import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, PointsMaterial } from 'three'

import {
  BASE_CAMERA_DISTANCE,
  GALAXY_CORE_BASE_SIZE,
  GALAXY_ROTATION_SPEED,
  MAX_STAR_SIZE_MULTIPLIER,
} from './constants'
import type { GalaxyStarData } from './types'
import { clamp, getStarTexture } from './utils'

interface GalaxyArmsProps {
  galaxyData: GalaxyStarData
}

const GalaxyArms = ({ galaxyData }: GalaxyArmsProps) => {
  const groupRef = useRef<Group>(null)
  const coreMaterialRefs = useRef<Array<PointsMaterial | null>>([])
  const starBuckets = galaxyData.buckets
  const sprite = useMemo(() => getStarTexture(), [])

  useFrame(({ clock, camera }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.elapsedTime * GALAXY_ROTATION_SPEED
    }

    const distance = camera.position.length()
    const scale = clamp(distance / BASE_CAMERA_DISTANCE, 1, MAX_STAR_SIZE_MULTIPLIER)
    const baseSize = GALAXY_CORE_BASE_SIZE * scale

    starBuckets.forEach((bucket, index) => {
      const coreMat = coreMaterialRefs.current[index]
      if (coreMat) {
        const targetSize = baseSize * bucket.sizeMultiplier
        if (Math.abs(coreMat.size - targetSize) > 0.001) {
          coreMat.size = targetSize
          coreMat.needsUpdate = true
        }
      }
    })
  })

  coreMaterialRefs.current.length = starBuckets.length

  return (
    <group ref={groupRef}>
      {starBuckets.map((bucket, index) => {
        if (bucket.positions.length === 0) {
          return null
        }

        const key = `galaxy-arm-type-${index}`

        return (
          <points key={key}>
            <bufferGeometry attach="geometry">
              <bufferAttribute
                attach="attributes-position"
                array={bucket.positions}
                count={bucket.positions.length / 3}
                itemSize={3}
              />
              <bufferAttribute
                attach="attributes-color"
                array={bucket.colors}
                count={bucket.colors.length / 3}
                itemSize={3}
              />
            </bufferGeometry>
            <pointsMaterial
              ref={(material) => {
                coreMaterialRefs.current[index] = material
              }}
              vertexColors
              size={GALAXY_CORE_BASE_SIZE * bucket.sizeMultiplier}
              sizeAttenuation
              depthWrite
              map={sprite ?? undefined}
              alphaMap={sprite ?? undefined}
              alphaTest={0.25}
            />
          </points>
        )
      })}
    </group>
  )
}

export default GalaxyArms
