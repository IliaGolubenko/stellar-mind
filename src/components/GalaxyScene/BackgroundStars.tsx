import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending } from 'three'
import type { BufferAttribute, Group, PointsMaterial } from 'three'

import { STAR_FIELD_BASE_SIZE, STAR_HALO_BASE_SIZE } from './constants'
import { createStarField } from './generators'
import { getStarTexture } from './utils'

const BackgroundStars = () => {
  const groupRef = useRef<Group>(null)
  const haloGroupRef = useRef<Group>(null)
  const colorAttributeRef = useRef<BufferAttribute | null>(null)
  const starField = useMemo(() => createStarField(), [])
  const sprite = useMemo(() => getStarTexture(), [])
  const starMaterialRef = useRef<PointsMaterial | null>(null)
  const haloMaterialRef = useRef<PointsMaterial | null>(null)

  useFrame(({ clock }) => {
    const attribute = colorAttributeRef.current
    if (!attribute) {
      return
    }

    const { colors, baseColors, flickerSpeeds, flickerOffsets } = starField
    const elapsed = clock.elapsedTime

    for (let i = 0; i < colors.length; i += 3) {
      const starIndex = i / 3
      const flicker =
        0.65 + 0.35 * Math.sin(elapsed * flickerSpeeds[starIndex] + flickerOffsets[starIndex])
      colors[i] = baseColors[i] * flicker
      colors[i + 1] = baseColors[i + 1] * flicker
      colors[i + 2] = baseColors[i + 2] * flicker
    }

    attribute.needsUpdate = true
  })

  return (
    <>
      <group ref={groupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[starField.positions, 3]}
              count={starField.positions.length / 3}
            />
            <bufferAttribute
              ref={(attribute) => {
                colorAttributeRef.current = attribute ?? null
              }}
              attach="attributes-color"
              args={[starField.colors, 3]}
              count={starField.colors.length / 3}
            />
          </bufferGeometry>
          <pointsMaterial
            ref={starMaterialRef}
            vertexColors
            size={STAR_FIELD_BASE_SIZE}
            sizeAttenuation
            transparent
            opacity={1}
            depthWrite={false}
            blending={AdditiveBlending}
            map={sprite ?? undefined}
            alphaMap={sprite ?? undefined}
            alphaTest={0.06}
          />
        </points>
      </group>
      <group ref={haloGroupRef}>
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[starField.positions, 3]}
              count={starField.positions.length / 3}
            />
          </bufferGeometry>
          <pointsMaterial
            ref={haloMaterialRef}
            color="#fdf8ff"
            transparent
            opacity={0.16}
            size={STAR_HALO_BASE_SIZE}
            sizeAttenuation
            depthWrite={false}
            blending={AdditiveBlending}
            map={sprite ?? undefined}
            alphaMap={sprite ?? undefined}
            alphaTest={0.04}
          />
        </points>
      </group>
    </>
  )
}

export default BackgroundStars
