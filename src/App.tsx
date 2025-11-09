import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import './App.css'

import GalaxyScene from './components/GalaxyScene'
import OverlayHeader from './components/OverlayHeader'
import PlanetTooltip from './components/PlanetTooltip'
import type { Exoplanet } from './types/exoplanet'
import useExoplanets from './hooks/useExoplanets'
import { useLanguage } from './i18n/LanguageProvider'
import { fetchPlanetDetail } from './store/exoplanetsSlice'
import type { RootState, AppDispatch } from './store'

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
  const { t, language, setLanguage } = useLanguage()
  const { items, status, error } = useExoplanets()
  const [selectedPlanet, setSelectedPlanet] = useState<Exoplanet | null>(null)
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)
  const dispatch = useDispatch<AppDispatch>()

  const featuredPlanets = useMemo(() => selectRandomPlanets(items), [items])

  const detailEntry = useSelector((state: RootState) =>
    selectedPlanet ? state.exoplanets.details[selectedPlanet.pl_name] : undefined,
  )
  const planetDetail = detailEntry?.data ?? null
  const planetDetailStatus = detailEntry?.status ?? 'idle'
  const planetDetailError = detailEntry?.error ?? null

  const handlePlanetSelect = useCallback((planet: Exoplanet) => {
    setSelectedPlanet((previous) =>
      previous?.pl_name === planet.pl_name ? { ...planet } : planet,
    )
    setIsTooltipOpen(true)
  }, [])

  useEffect(() => {
    setSelectedPlanet(null)
    setIsTooltipOpen(false)
  }, [items])

  useEffect(() => {
    if (!selectedPlanet) return
    if (detailEntry) return

    dispatch(fetchPlanetDetail(selectedPlanet.pl_name))
  }, [detailEntry, dispatch, selectedPlanet])

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
          onPlanetSelect={handlePlanetSelect}
        />
        {status === 'loading' && (
          <div className="status status--floating">{t('status.loading')}</div>
        )}
        {status === 'failed' && (
          <div className="status status--floating status--error" role="alert">
            {t('status.error', { error: error ?? '' })}
          </div>
        )}
        {status === 'succeeded' && featuredPlanets.length === 0 && (
          <div className="status status--floating" role="status">
            {t('status.empty')}
          </div>
        )}
      </section>

      <OverlayHeader
        t={t}
        language={language}
        setLanguage={setLanguage}
        onPlanetSelect={handlePlanetSelect}
      />

      <PlanetTooltip
        planet={selectedPlanet}
        visible={isTooltipOpen && Boolean(selectedPlanet)}
        detailedPlanet={planetDetail}
        detailStatus={planetDetailStatus}
        detailError={planetDetailError}
        onClose={closeTooltip}
      />

      <footer className="overlay overlay--footer">
        <p>{t('footer.instructions')}</p>
      </footer>
    </main>
  )
}

export default App
