import type { Exoplanet } from '../../types/exoplanet'

export interface GalaxySceneProps {
  planets: Exoplanet[]
  onPlanetSelect: (planet: Exoplanet) => void
  onPlanetHover?: (planet: Exoplanet | null) => void
}

export interface PlanetInstance {
  planet: Exoplanet
  position: [number, number, number]
  baseColor: string
  scale: number
}

export interface HazeSpriteInfo {
  id: number
  position: [number, number, number]
  size: number
}

export interface GalaxyStarBucket {
  positions: Float32Array
  colors: Float32Array
  sizeMultiplier: number
}

export interface GalaxyStarData {
  buckets: GalaxyStarBucket[]
  positions: Float32Array
  colors: Float32Array
}
