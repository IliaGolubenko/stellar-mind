import { Suspense, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'

import type { Exoplanet } from '../types/exoplanet'
import { IS_DEV } from '../utils/constants'
import { getPlanetBaseColor, getPlanetVisual } from './GalaxyScene/utils'
import PlanetMesh from './GalaxyScene/PlanetMesh'

interface PlanetTooltipProps {
  planet: Exoplanet | null
  visible: boolean
  onClose: () => void
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

const formatTemperatureCelsius = (kelvin: number | null) => {
  if (kelvin === null || Number.isNaN(kelvin)) return 'N/A'

  const celsius = kelvin - 273.15
  return formatNumber(celsius, 0)
}

const PlanetTooltip = ({ planet, visible, onClose }: PlanetTooltipProps) => {
  const visual = useMemo(
    () => (planet ? getPlanetVisual(planet) : null),
    [planet],
  )
  const previewBaseColor = useMemo(
    () => (visual ? getPlanetBaseColor(visual.type) : '#ffffff'),
    [visual],
  )
  const [showAtmosphere, setShowAtmosphere] = useState(true)

  if (!visible || !planet || !visual) {
    return null
  }

  const devMetadata = IS_DEV ? visual : null
  return (
    <aside className="tooltip" role="dialog" aria-modal="false">
      <header className="tooltip__header">
        <div className="tooltip__header-text">
          <p>Featured Exoplanet</p>
          <h2>{planet.pl_name}</h2>
        </div>
        <button
          type="button"
          className="tooltip__close"
          onClick={onClose}
          aria-label="Close planet details"
        >
          Close
        </button>
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
              showAtmosphere={showAtmosphere}
              emissiveIntensityMultiplier={0.55}
            />
          </Suspense>
        </Canvas>
      </div>
      <div className="tooltip__controls">
        <label>
          <input
            type="checkbox"
            checked={showAtmosphere}
            onChange={(event) => setShowAtmosphere(event.target.checked)}
          />
          Show atmosphere
        </label>
      </div>
      <ul>
        {devMetadata && renderMetric('Texture Key (dev)', devMetadata.textureKey)}
        {devMetadata && renderMetric('Atmosphere (dev)', devMetadata.atmosphere)}
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
          'Equilibrium Temp (Celsius)',
          formatTemperatureCelsius(planet.pl_eqt),
        )}
      </ul>
    </aside>
  )
}

export default PlanetTooltip
