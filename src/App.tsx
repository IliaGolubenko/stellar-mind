import { FormEvent, UIEvent, useCallback, useEffect, useMemo, useState } from 'react'

import './App.css'

import GalaxyScene from './components/GalaxyScene'
import PlanetTooltip from './components/PlanetTooltip'
import type { Exoplanet } from './types/exoplanet'
import useExoplanets from './hooks/useExoplanets'
import {
  buildDistanceQuery,
  buildEarthlikeQuery,
  buildPreciseSearchQuery,
  buildTapUrl,
} from './utils/constants'
import { transformExoplanetEntry } from './utils/exoplanets'

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

type AdvancedTab = 'earthlike' | 'distance' | 'search'
const ADVANCED_PAGE_SIZE = 25

const formatAdvancedValue = (value: number | null, digits = 1) => {
  if (value === null || Number.isNaN(value)) return '—'
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString(undefined, { maximumFractionDigits: digits })
  }
  return value.toFixed(digits)
}

const parsecToLightYears = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return null
  return value * 3.26156
}

function App() {
  const { items, status, error } = useExoplanets()
  const [selectedPlanet, setSelectedPlanet] = useState<Exoplanet | null>(null)
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)
  const [activeAdvancedTab, setActiveAdvancedTab] = useState<AdvancedTab>('earthlike')
  const [advancedResults, setAdvancedResults] = useState<Exoplanet[]>([])
  const [advancedStatus, setAdvancedStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>(
    'idle',
  )
  const [advancedError, setAdvancedError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [lastSearchTerm, setLastSearchTerm] = useState('')
  const [advancedOffset, setAdvancedOffset] = useState(0)
  const [hasMoreAdvanced, setHasMoreAdvanced] = useState(true)
  const [isFetchingMoreAdvanced, setIsFetchingMoreAdvanced] = useState(false)

  const featuredPlanets = useMemo(() => selectRandomPlanets(items), [items])

  const handlePlanetSelect = useCallback((planet: Exoplanet) => {
    setSelectedPlanet(planet)
    setIsTooltipOpen(true)
  }, [])

  const resetAdvancedState = useCallback(() => {
    setAdvancedResults([])
    setAdvancedStatus('idle')
    setAdvancedError(null)
    setAdvancedOffset(0)
    setHasMoreAdvanced(true)
    setIsFetchingMoreAdvanced(false)
  }, [])

  const getAdvancedQuery = useCallback(
    (topCount: number) => {
      if (activeAdvancedTab === 'earthlike') {
        return buildEarthlikeQuery(topCount)
      }
      if (activeAdvancedTab === 'distance') {
        return buildDistanceQuery(topCount)
      }
      if (activeAdvancedTab === 'search' && lastSearchTerm) {
        return buildPreciseSearchQuery(lastSearchTerm, topCount)
      }
      return null
    },
    [activeAdvancedTab, lastSearchTerm],
  )

  const fetchAdvancedData = useCallback(
    async (offset: number, append: boolean) => {
      const topCount = offset + ADVANCED_PAGE_SIZE
      const query = getAdvancedQuery(topCount)
      if (!query) {
        setAdvancedResults([])
        setHasMoreAdvanced(false)
        if (!append) {
          setAdvancedStatus('succeeded')
        }
        return
      }

      if (append) {
        setIsFetchingMoreAdvanced(true)
      } else {
        setAdvancedStatus('loading')
      }
      setAdvancedError(null)

      try {
        const response = await fetch(buildTapUrl(query))
        if (!response.ok) {
          throw new Error(`NASA TAP error: ${response.status} ${response.statusText}`)
        }
        const payload = (await response.json()) as Record<string, unknown>[]
        const mapped = payload.map(transformExoplanetEntry)
        const pageItems = mapped.slice(offset, offset + ADVANCED_PAGE_SIZE)
        setAdvancedResults((prev) => (append ? [...prev, ...pageItems] : pageItems))
        setAdvancedOffset(offset + pageItems.length)
        setHasMoreAdvanced(pageItems.length === ADVANCED_PAGE_SIZE)
        setAdvancedStatus('succeeded')
      } catch (fetchError) {
        if (!append) {
          setAdvancedStatus('failed')
        }
        setAdvancedError(fetchError instanceof Error ? fetchError.message : 'Failed to load data')
      } finally {
        if (append) {
          setIsFetchingMoreAdvanced(false)
        }
      }
    },
    [getAdvancedQuery],
  )

  const handleAdvancedToggle = () => {
    setIsAdvancedMode((prev) => {
      const next = !prev
      if (next) {
        setActiveAdvancedTab('earthlike')
        setSearchTerm('')
        setLastSearchTerm('')
        resetAdvancedState()
      } else {
        resetAdvancedState()
        setSearchTerm('')
        setLastSearchTerm('')
        setActiveAdvancedTab('earthlike')
      }
      return next
    })
  }

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = searchTerm.trim()
    if (!trimmed) return
    if (activeAdvancedTab === 'search' && trimmed === lastSearchTerm) {
      resetAdvancedState()
      await fetchAdvancedData(0, false)
      return
    }
    setActiveAdvancedTab('search')
    setLastSearchTerm(trimmed)
  }

  const handleAdvancedScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (
        !hasMoreAdvanced ||
        isFetchingMoreAdvanced ||
        advancedStatus === 'loading' ||
        !isAdvancedMode
      ) {
        return
      }

      const target = event.currentTarget
      const threshold = 24
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - threshold) {
        fetchAdvancedData(advancedOffset, true)
      }
    },
    [
      advancedOffset,
      advancedStatus,
      fetchAdvancedData,
      hasMoreAdvanced,
      isAdvancedMode,
      isFetchingMoreAdvanced,
    ],
  )

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

  useEffect(() => {
    if (!isAdvancedMode) {
      resetAdvancedState()
      return
    }

    if (activeAdvancedTab === 'search' && !lastSearchTerm) {
      resetAdvancedState()
      return
    }

    resetAdvancedState()
    fetchAdvancedData(0, false)
  }, [
    activeAdvancedTab,
    fetchAdvancedData,
    isAdvancedMode,
    lastSearchTerm,
    resetAdvancedState,
  ])

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
        <div className="overlay__header-top">
          <div>
            <h1>Stellar Mind Observatory</h1>
            <p>
              Spin the galaxy, discover planets inspired by NASA&apos;s Exoplanet Archive, and learn
              their stories.
            </p>
          </div>
          <button type="button" className="advanced-toggle" onClick={handleAdvancedToggle}>
            {isAdvancedMode ? 'Hide advanced mode' : 'Advanced mode'}
          </button>
        </div>

        {isAdvancedMode && (
          <section className="advanced-panel">
            <form className="advanced-search" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by planet name (e.g., Kepler)"
                aria-label="Planet name search"
              />
              <button type="submit">Search</button>
            </form>

            <div className="advanced-tabs" role="tablist">
              <button
                type="button"
                className={activeAdvancedTab === 'earthlike' ? 'is-active' : undefined}
                onClick={() => setActiveAdvancedTab('earthlike')}
                role="tab"
              >
                Earth-like prospects
              </button>
              <button
                type="button"
                className={activeAdvancedTab === 'distance' ? 'is-active' : undefined}
                onClick={() => setActiveAdvancedTab('distance')}
                role="tab"
              >
                Closest neighbors
              </button>
            </div>

            <div className="advanced-results">
              {advancedStatus === 'loading' && <p className="advanced-status">Fetching data…</p>}
              {advancedStatus === 'failed' && advancedError && (
                <p className="advanced-status advanced-status--error">
                  Unable to load data: {advancedError}
                </p>
              )}
              {activeAdvancedTab === 'search' && !lastSearchTerm && advancedStatus !== 'loading' && (
                <p className="advanced-status">Enter a planet name to search.</p>
              )}
              {advancedStatus === 'succeeded' &&
                advancedResults.length === 0 &&
                (activeAdvancedTab !== 'search' || lastSearchTerm) && (
                  <p className="advanced-status">No planets matched the query.</p>
                )}
              {activeAdvancedTab === 'search' && advancedResults.length > 0 && lastSearchTerm && (
                <p className="advanced-status">Search results for "{lastSearchTerm}".</p>
              )}
              {advancedResults.length > 0 && (
                <div className="advanced-table-wrapper" onScroll={handleAdvancedScroll}>
                  <table className="advanced-table">
                    <thead>
                      <tr>
                        <th>Planet</th>
                        <th>Distance (ly)</th>
                        <th>Radius (R⊕)</th>
                        <th>Mass (M⊕)</th>
                        <th>Eq. temp (K)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advancedResults.map((planet) => (
                        <tr
                          key={`${planet.pl_name}-${planet.hostname ?? 'host'}`}
                          tabIndex={0}
                          onClick={() => handlePlanetSelect(planet)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              handlePlanetSelect(planet)
                            }
                          }}
                        >
                          <td>
                            <strong>{planet.pl_name}</strong>
                            <span>{planet.hostname ?? 'Unknown star'}</span>
                          </td>
                          <td>{formatAdvancedValue(parsecToLightYears(planet.sy_dist), 1)}</td>
                          <td>{formatAdvancedValue(planet.pl_rade, 2)}</td>
                          <td>{formatAdvancedValue(planet.pl_bmasse, 2)}</td>
                          <td>{formatAdvancedValue(planet.pl_eqt, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {isFetchingMoreAdvanced && (
                <p className="advanced-status">Loading more planets…</p>
              )}
              {!hasMoreAdvanced && advancedResults.length > 0 && (
                <p className="advanced-status">You&apos;ve reached the end of this list.</p>
              )}
            </div>
          </section>
        )}
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
