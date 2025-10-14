import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

import type { Exoplanet } from '../../types/exoplanet'
import { GALAXY_COLORS, GALAXY_ROTATION_SPEED } from './constants'
import Planet from './Planet'
import { randomBetween } from './utils'
import type { PlanetInstance } from './types'

interface PlanetsFieldProps {
  planets: Exoplanet[]
  onSelect: (planet: Exoplanet) => void
  onHover: (planet: Exoplanet | null) => void
}

const PlanetsField = ({ planets, onSelect, onHover }: PlanetsFieldProps) => {
  const groupRef = useRef<Group>(null)
  const instances = useMemo<PlanetInstance[]>(() => {
    if (planets.length === 0) {
      return []
    }

    const baseRadius = 28
    const armSeparation = (Math.PI * 2) / Math.max(planets.length, 1)

    return planets.map((planet, index) => {
      const angle = index * armSeparation + randomBetween(-0.18, 0.18)
      const radius = baseRadius + index * 8 + randomBetween(-3, 3)
      const verticalFalloff = Math.max(0.3, 1 - radius / 180)
      const height = randomBetween(-2, 2) * verticalFalloff
      const position: [number, number, number] = [
        Math.cos(angle) * radius * 1.5,
        height,
        Math.sin(angle) * radius,
      ]

      return {
        planet,
        position,
        color: GALAXY_COLORS[index % GALAXY_COLORS.length],
        scale: 3.1 + Math.random() * 1.4,
      }
    })
  }, [planets])

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = clock.elapsedTime * GALAXY_ROTATION_SPEED
  })

  return (
    <group ref={groupRef}>
      {instances.map((instance) => (
        <Planet
          key={instance.planet.pl_name}
          instance={instance}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
    </group>
  )
}

export default PlanetsField
