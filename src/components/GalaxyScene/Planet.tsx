import { useState } from 'react'

import type { Exoplanet } from '../../types/exoplanet'
import PlanetMesh from './PlanetMesh'
import type { PlanetInstance } from './types'

interface PlanetProps {
  instance: PlanetInstance
  onSelect: (planet: Exoplanet) => void
  onHover: (planet: Exoplanet | null) => void
}

const Planet = ({ instance, onSelect, onHover }: PlanetProps) => {
  const [hovered, setHovered] = useState(false)

  const planetScale = hovered ? instance.scale * 1.12 : instance.scale

  return (
    <PlanetMesh
      planet={instance.planet}
      baseColor={instance.baseColor}
      position={instance.position}
      scale={planetScale}
      enableRotation
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
    />
  )
}

export default Planet
