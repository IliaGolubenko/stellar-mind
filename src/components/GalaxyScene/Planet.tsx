import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

import type { Exoplanet } from '../../types/exoplanet'
import type { PlanetInstance } from './types'

const textureMap = {
  rocky: {
    hot: ["lava_rock_02", "volcanic_ash_01"],
    temperate: ["rock_cracked_01", "soil_dry_02"],
    cold: ["frozen_rock_01", "ice_patch_03"]
  },
  ocean: {
    hot: ["boiling_ocean_01"],
    temperate: ["blue_ocean_02", "wet_rock_01"],
    cold: ["frozen_ocean_01"]
  },
  ice: {
    hot: ["melting_ice_01"],
    temperate: ["glacier_surface_02"],
    cold: ["snow_field_01", "ice_crust_03"]
  },
  gas: {
    hot: ["jupiter_bands_01", "brown_swirl_02"],
    temperate: ["saturn_bands_01"],
    cold: ["blue_giant_01"]
  },
  lava: {
    hot: ["lava_surface_01", "basalt_glow_02"]
  }
}

function getTemperatureZone(st_teff: number | null, pl_orbper: number | null): "cold" | "temperate" | "hot" {
  if (!st_teff || !pl_orbper) return "temperate"

  const score = st_teff / (pl_orbper || 1)
  if (score > 500) return "hot"
  if (score < 100) return "cold"
  return "temperate"
}

function getPlanetVisual(p: Exoplanet) {
  let type: string
  if (p.pl_rade && p.pl_rade > 6) type = "gas"
  else if (p.pl_rade && p.pl_rade > 3) type = "ice"
  else if (p.pl_rade && p.pl_rade > 1.5) type = "ocean"
  else if (p.st_teff && p.st_teff > 6000 && p.pl_orbper && p.pl_orbper < 30)
    type = "lava"
  else type = "rocky"

  const temp = getTemperatureZone(p.st_teff, p.pl_orbper)

  const atmosphere =
    type === "gas" || type === "ice" ? "thick" :
    p.pl_bmasse && p.pl_bmasse < 0.5 ? "none" :
    "thin"

  const textures = textureMap[type as keyof typeof textureMap][temp]
  const texture = textures[Math.floor(Math.random() * textures.length)]

  return { type, temperature: temp, atmosphere, texture }
}



interface PlanetProps {
  instance: PlanetInstance
  onSelect: (planet: Exoplanet) => void
  onHover: (planet: Exoplanet | null) => void
}

const Planet = ({ instance, onSelect, onHover }: PlanetProps) => {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y = clock.elapsedTime * 0.1
  })
  // console.log('instance', instance)
  console.log('getPlanetVisual', getPlanetVisual(instance.planet))
  return (
    <mesh
      ref={meshRef}
      position={instance.position}
      scale={hovered ? instance.scale * 1.12 : instance.scale}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(instance.planet)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
        onHover(instance.planet)
      }}
      onPointerOut={() => {
        setHovered(false)
        onHover(null)
      }}
      castShadow
    >
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color={instance.color}
        roughness={0.42}
        metalness={0.25}
        emissive={instance.color}
        emissiveIntensity={0.35}
      />
    </mesh>
  )
}

export default Planet
