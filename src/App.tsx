import { useEffect, useMemo, useState } from 'react'

import './App.css'

import GalaxyScene from './components/GalaxyScene'
import PlanetTooltip from './components/PlanetTooltip'
import type { Exoplanet } from './types/exoplanet'
import useExoplanets from './hooks/useExoplanets'

const selectRandomPlanets = (planets: Exoplanet[], count = 4) => {
  if (planets.length <= count) {
    return planets
  }

  const prioritized = planets.filter(
    (planet) => planet.pl_rade !== null && planet.pl_bmasse !== null,
  )
  const pool = prioritized.length >= count ? prioritized : planets
  const candidates = [...pool]

  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  return candidates.slice(0, count)
}

function App() {
  const { items, status, error } = useExoplanets()
  const [selectedPlanet, setSelectedPlanet] = useState<Exoplanet | null>(null)
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)

  const featuredPlanets = useMemo(() => selectRandomPlanets(items), [items])

  useEffect(() => {
    setSelectedPlanet(null)
    setIsTooltipOpen(false)
  }, [items])

  useEffect(() => {
    if (!isTooltipOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsTooltipOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isTooltipOpen])

  const closeTooltip = () => {
    setIsTooltipOpen(false)
  }

  return (
    <main className="app-shell">
      <section className="scene-wrapper">
        <GalaxyScene
          planets={featuredPlanets}
          onPlanetSelect={(planet) => {
            setSelectedPlanet(planet)
            setIsTooltipOpen(true)
          }}
        />
        {status === 'loading' && (
          <div className="status status--floating">Summoning the cosmos...</div>
        )}
        {status === 'failed' && (
          <div className="status status--floating status--error" role="alert">
            Unable to reach the NASA archive: {error}
          </div>
        )}
        {status === 'succeeded' && featuredPlanets.length === 0 && (
          <div className="status status--floating" role="status">
            No exoplanets available right now. Try again soon.
          </div>
        )}
      </section>

      <header className="overlay overlay--header">
        <h1>Stellar Mind Observatory</h1>
        <p>
          Spin the galaxy, discover planets inspired by NASA&apos;s Exoplanet Archive, and learn
          their stories.
        </p>
      </header>

      <PlanetTooltip
        planet={selectedPlanet}
        visible={isTooltipOpen && Boolean(selectedPlanet)}
        onClose={closeTooltip}
      />

      <footer className="overlay overlay--footer">
        <p>Drag or swipe to rotate. Click a planet to pin its details.</p>
      </footer>
    </main>
  )
}

export default App
