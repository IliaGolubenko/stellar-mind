import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import type { Group, Texture } from 'three'
import { AdditiveBlending, Color, SRGBColorSpace } from 'three'

import type { Exoplanet } from '../../types/exoplanet'
import { clamp, getPlanetVisual, getTextureAssetPaths } from './utils'

const TEMPERATURE_COLOR_MAP: Record<string, string> = {
  cold: '#60a5fa',
  temperate: '#38bdf8',
  hot: '#fb923c',
  inferno: '#ef4444',
}

const STAR_CLASS_COLOR_MAP: Record<string, string> = {
  o: '#38bdf8',
  b: '#60a5fa',
  a: '#e0f2fe',
  f: '#fde68a',
  g: '#fbbf24',
  k: '#fb923c',
  m: '#f97316',
}

const getStarTint = (planet: Exoplanet) => {
  const spectral = planet.st_spectype?.trim().toLowerCase()
  if (spectral && STAR_CLASS_COLOR_MAP[spectral[0]]) {
    return new Color(STAR_CLASS_COLOR_MAP[spectral[0]])
  }

  const teff = planet.st_teff
  if (!Number.isFinite(teff)) {
    return new Color('#cbd5f5')
  }

  if (teff < 3800) return new Color('#f97316')
  if (teff < 5200) return new Color('#fb923c')
  if (teff < 6000) return new Color('#facc15')
  if (teff < 7500) return new Color('#e0f2fe')
  return new Color('#60a5fa')
}

const TEMPERATURE_MIN = 160
const TEMPERATURE_MAX = 1300

const normalisedHeat = (eqt: number | null) => {
  if (!Number.isFinite(eqt)) return 0
  return clamp((eqt - TEMPERATURE_MIN) / (TEMPERATURE_MAX - TEMPERATURE_MIN), 0, 1)
}

const normalisedDensity = (density: number | null) => {
  if (!Number.isFinite(density)) return 0.5
  return clamp((density - 1) / 6, 0, 1)
}

const normalisedInsolation = (insol: number | null) => {
  if (!Number.isFinite(insol) || insol <= 0) return 0
  const scaled = Math.log10(insol + 1)
  return clamp(scaled / Math.log10(60), 0, 1)
}

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

    const temperatureColor = new Color(
      TEMPERATURE_COLOR_MAP[visual.temperature] ?? baseColor,
    )
    const starTint = getStarTint(planet)
    const combined = temperatureColor.clone().lerp(starTint, 0.35)

    const heatFactor = normalisedHeat(planet.pl_eqt)
    if (heatFactor > 0) {
      combined.lerp(new Color('#fde68a'), heatFactor * 0.25)
      combined.offsetHSL(0, heatFactor * 0.08, heatFactor * 0.12)
    }

    const densityFactor = normalisedDensity(planet.pl_dens)
    combined.offsetHSL(0, (densityFactor - 0.5) * 0.12, (0.3 - densityFactor) * 0.08)

    const insolationFactor = normalisedInsolation(planet.pl_insol)
    if (insolationFactor > 0) {
      combined.lerp(new Color('#f97316'), insolationFactor * 0.18)
    }

    const opacityBase = visual.atmosphere === 'thick' ? 0.32 : 0.18
    const opacity = opacityBase + heatFactor * 0.08 + insolationFactor * 0.05
    const atmosphereScale = visual.atmosphere === 'thick' ? 1.2 : 1.15

    return { color: `#${combined.getHexString()}`, opacity, atmosphereScale }
  }, [
    baseColor,
    planet.pl_dens,
    planet.pl_eqt,
    planet.pl_insol,
    planet.st_spectype,
    planet.st_teff,
    showAtmosphere,
    visual.atmosphere,
    visual.temperature,
  ])

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
