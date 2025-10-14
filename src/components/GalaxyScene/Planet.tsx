import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

import type { Exoplanet } from '../../types/exoplanet'
import type { PlanetInstance } from './types'

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
