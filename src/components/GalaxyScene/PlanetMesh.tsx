import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import type { Group, Texture } from 'three'
import { AdditiveBlending, Color, SRGBColorSpace } from 'three'

import type { Exoplanet } from '../../types/exoplanet'
import { getPlanetVisual, getTextureAssetPaths } from './utils'

type MaterialTextures = Partial<
  Record<'map' | 'normalMap' | 'roughnessMap' | 'emissiveMap' | 'displacementMap', Texture>
>

interface PlanetMeshProps {
  planet: Exoplanet
  baseColor: string
  scale?: number
  position?: [number, number, number]
  rotationSpeed?: number
  enableRotation?: boolean
  showAtmosphere?: boolean
  onClick?: (event: Parameters<JSX.IntrinsicElements['mesh']['onClick']>[0]) => void
  onPointerOver?: (event: Parameters<JSX.IntrinsicElements['mesh']['onPointerOver']>[0]) => void
  onPointerOut?: (event: Parameters<JSX.IntrinsicElements['mesh']['onPointerOut']>[0]) => void
  emissiveIntensityMultiplier?: number
  displacementScaleMultiplier?: number
  geometryDetail?: number
}

const PlanetMesh = ({
  planet,
  baseColor,
  scale = 1,
  position,
  rotationSpeed = 0.1,
  enableRotation = true,
  showAtmosphere = true,
  onClick,
  onPointerOver,
  onPointerOut,
  emissiveIntensityMultiplier = 1,
  displacementScaleMultiplier = 5,
  geometryDetail,
}: PlanetMeshProps) => {
  const groupRef = useRef<Group>(null)

  const visual = useMemo(() => getPlanetVisual(planet), [planet])

  const textureDescriptors = useMemo(() => {
    const assets = getTextureAssetPaths(visual.textureKey)
    const descriptors: Record<string, string> = {
      map: assets.color,
    }

    if (assets.normal) descriptors.normalMap = assets.normal
    if (assets.roughness) descriptors.roughnessMap = assets.roughness
    if (assets.emissive) descriptors.emissiveMap = assets.emissive
    if (assets.displacement) descriptors.displacementMap = assets.displacement

    return descriptors
  }, [visual.textureKey])

  const textures = useTexture(textureDescriptors) as MaterialTextures

  useEffect(() => {
    if (textures.map) {
      textures.map.colorSpace = SRGBColorSpace
    }
  }, [textures.map])

  const hasTexture = Boolean(textures.map)
  const emissiveColor = textures.emissiveMap
    ? '#ffffff'
    : hasTexture
      ? '#000000'
      : baseColor
  const emissiveIntensityBase = textures.emissiveMap
    ? 0.35
    : hasTexture
      ? 0.08
      : 0.35
  const emissiveIntensity = emissiveIntensityBase * emissiveIntensityMultiplier

  const displacementScale = useMemo(() => {
    const baseScaleByType: Record<string, number> = {
      rocky: 0.028,
      lava: 0.022,
      ocean: 0.018,
      ice: 0.02,
      gas: 0.012,
    }
    const baseScale = baseScaleByType[visual.type] ?? 0.02
    return baseScale * displacementScaleMultiplier
  }, [displacementScaleMultiplier, visual.type])

  const sphereSegments = geometryDetail ?? (visual.type === 'gas' ? 120 : 180)

  const atmosphereConfig = useMemo(() => {
    if (!showAtmosphere || visual.atmosphere === 'none') {
      return null
    }

    const color = new Color(baseColor)
    const tint = new Color('#ffffff')
    const lerpFactor = visual.atmosphere === 'thick' ? 0.6 : 0.4
    const colorHex = `#${color.clone().lerp(tint, lerpFactor).getHexString()}`
    const opacity = visual.atmosphere === 'thick' ? 0.3 : 0.16
    const atmosphereScale = visual.atmosphere === 'thick' ? 1.18 : 1.1

    return { color: colorHex, opacity, atmosphereScale }
  }, [baseColor, showAtmosphere, visual.atmosphere])

  useFrame(({ clock }) => {
    if (!enableRotation || !groupRef.current) return
    groupRef.current.rotation.y = clock.elapsedTime * rotationSpeed
  })

  return (
    <group ref={groupRef} scale={scale} position={position}>
      <mesh onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut} castShadow>
        <sphereGeometry args={[1, sphereSegments, sphereSegments]} />
        <meshStandardMaterial
          color={hasTexture ? '#ffffff' : baseColor}
          map={textures.map}
          normalMap={textures.normalMap}
          roughnessMap={textures.roughnessMap}
          emissiveMap={textures.emissiveMap}
          displacementMap={textures.displacementMap}
          displacementScale={textures.displacementMap ? displacementScale : 0}
          roughness={textures.roughnessMap ? 1 : 0.42}
          metalness={0.25}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      {atmosphereConfig && (
        <mesh scale={atmosphereConfig.atmosphereScale} raycast={() => null}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshBasicMaterial
            color={atmosphereConfig.color}
            transparent
            opacity={atmosphereConfig.opacity}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}

export default PlanetMesh
