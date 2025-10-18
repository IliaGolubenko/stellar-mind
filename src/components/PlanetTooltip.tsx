import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'

import type { Exoplanet } from '../types/exoplanet'
import { IS_DEV } from '../utils/constants'
import { getPlanetBaseColor, getPlanetVisual } from './GalaxyScene/utils'
import PlanetMesh from './GalaxyScene/PlanetMesh'

interface PlanetTooltipProps {
  planet: Exoplanet | null
  visible: boolean
}

const renderMetric = (label: string, value: string | number | null) => (
  <li>
    <span>{label}</span>
    <strong>{value ?? 'N/A'}</strong>
  </li>
)

const formatNumber = (value: number | null, digits = 2) => {
  if (value === null || Number.isNaN(value)) return 'N/A'

  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: digits })
  }

  return value.toFixed(digits)
}

const PlanetTooltip = ({ planet, visible }: PlanetTooltipProps) => {
  if (!visible || !planet) {
    return null
  }

  const visual = useMemo(() => getPlanetVisual(planet), [planet])
  const devMetadata = IS_DEV ? visual : null

  const previewBaseColor = useMemo(() => getPlanetBaseColor(visual.type), [visual.type])

  return (
    <aside className="tooltip">
      <header>
        <p>Featured Exoplanet</p>
        <h2>{planet.pl_name}</h2>
      </header>
      <div
        className="tooltip__planet-preview"
        style={{ width: '100%', height: '480px', pointerEvents: 'none' }}
      >
        <Canvas camera={{ position: [0, 0, 2.4], fov: 60 }}>
          <ambientLight intensity={0.6} />
          <directionalLight intensity={1.2} position={[2, 2.4, 3]} />
          <Suspense fallback={null}>
            <PlanetMesh
              planet={planet}
              baseColor={previewBaseColor}
              scale={1}
              rotationSpeed={0.18}
              showAtmosphere
              emissiveIntensityMultiplier={0.55}
            />
          </Suspense>
        </Canvas>
      </div>
      <ul>
        {devMetadata && renderMetric('Texture Key (dev)', devMetadata.textureKey)}
        {renderMetric('Host Star', planet.hostname)}
        {renderMetric('Discovery Method', planet.discoverymethod)}
        {renderMetric('Discovery Year', planet.disc_year)}
        {renderMetric(
          'Orbital Period (days)',
          planet.pl_orbper !== null ? formatNumber(planet.pl_orbper) : null,
        )}
        {renderMetric(
          'Planet Radius (Earth = 1)',
          planet.pl_rade !== null ? formatNumber(planet.pl_rade) : null,
        )}
        {renderMetric(
          'Planet Mass (Earth = 1)',
          planet.pl_bmasse !== null ? formatNumber(planet.pl_bmasse) : null,
        )}
        {renderMetric(
          'Planet Density (g/cm^3)',
          planet.pl_dens !== null ? formatNumber(planet.pl_dens) : null,
        )}
        {renderMetric(
          'Equilibrium Temp (K)',
          planet.pl_eqt !== null ? formatNumber(planet.pl_eqt, 0) : null,
        )}
      </ul>
    </aside>
  )
}

export default PlanetTooltip
