import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, SpriteMaterial, SRGBColorSpace, Texture } from 'three'
import { useTexture } from '@react-three/drei'
import type { Sprite } from 'three'

import { BASE_LAYER, HAZE_COLOR, HAZE_OPACITY } from './constants'
import { clamp } from './utils'
import { createHazeField } from './generators'

interface GalaxyHazeFieldProps {
  starPositions: Float32Array
}

const GalaxyHazeField = ({ starPositions }: GalaxyHazeFieldProps) => {
  const hazeTexture = useTexture('/feathered60.png') as Texture
  const hazePatches = useMemo(() => createHazeField(starPositions), [starPositions])
  const spriteRefs = useRef<Array<Sprite | null>>([])

  useEffect(() => {
    hazeTexture.colorSpace = SRGBColorSpace
    hazeTexture.needsUpdate = true
  }, [hazeTexture])

  useFrame(({ camera }) => {
    spriteRefs.current.forEach((sprite) => {
      if (!sprite) {
        return
      }
      const material = sprite.material as SpriteMaterial
      const distance = sprite.position.distanceTo(camera.position) / 250
      const targetOpacity = clamp(HAZE_OPACITY * Math.pow(distance / 2.5, 2), 0, HAZE_OPACITY)

      if (Math.abs(material.opacity - targetOpacity) > 0.001) {
        material.opacity = targetOpacity
        material.needsUpdate = true
      }
    })
  })

  return (
    <group>
      {hazePatches.map((patch, index) => (
        <sprite
          key={`haze-${patch.id}-${index}`}
          position={patch.position}
          scale={[patch.size, patch.size, patch.size]}
          ref={(sprite) => {
            if (sprite) {
              sprite.layers.set(BASE_LAYER)
            }
            spriteRefs.current[index] = sprite ?? null
          }}
        >
          <spriteMaterial
            map={hazeTexture}
            color={HAZE_COLOR}
            opacity={HAZE_OPACITY}
            transparent
            depthTest={false}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  )
}

export default GalaxyHazeField
