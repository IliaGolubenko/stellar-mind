import { FormEvent, UIEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import './App.css'

import GalaxyScene from './components/GalaxyScene'
import PlanetTooltip from './components/PlanetTooltip'
import type { Exoplanet } from './types/exoplanet'
import useExoplanets from './hooks/useExoplanets'
import {
  buildDistanceQuery,
  buildEarthlikeQuery,
  buildHabitableZoneQuery,
  buildPreciseSearchQuery,
  buildTapUrl,
} from './utils/constants'
import type { HabitableStrictness } from './utils/constants'
import { transformExoplanetEntry } from './utils/exoplanets'
import { useLanguage } from './i18n/LanguageProvider'
import { fetchPlanetDetail } from './store/exoplanetsSlice'
import type { RootState, AppDispatch } from './store'
import { saveAdvancedRecord, clearAdvancedRecord } from './store/advancedResultsSlice'

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
type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed'
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

const buildAdvancedCacheKey = (
  tab: AdvancedTab,
  mode: HabitableStrictness | 'off',
  searchTerm: string,
) => {
  if (tab === 'earthlike') {
    return `earthlike-${mode}`
  }
  if (tab === 'distance') {
    return 'distance'
  }
  if (tab === 'search') {
    const term = searchTerm.trim().toLowerCase()
    return term ? `search-${term}` : 'search-empty'
  }
  return tab
}


const DEFAULT_ADVANCED_RECORD = {
  items: [] as Exoplanet[],
  status: 'idle' as LoadStatus,
  error: null as string | null,
  offset: 0,
  hasMore: true,
}

function App() {
  const { t, language, setLanguage } = useLanguage()
  const { items, status, error } = useExoplanets()
  const [selectedPlanet, setSelectedPlanet] = useState<Exoplanet | null>(null)
  const [isTooltipOpen, setIsTooltipOpen] = useState(false)
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)
  const [activeAdvancedTab, setActiveAdvancedTab] = useState<AdvancedTab>('earthlike')
  const [advancedResultsState, setAdvancedResultsState] = useState<Exoplanet[]>([])
  const [advancedStatusState, setAdvancedStatusState] = useState<LoadStatus>('idle')
  const [advancedErrorState, setAdvancedErrorState] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [lastSearchTerm, setLastSearchTerm] = useState('')
  const [habitableMode, setHabitableMode] = useState<HabitableStrictness | 'off'>('off')
  const dispatch = useDispatch<AppDispatch>()
  const [advancedOffsetState, setAdvancedOffsetState] = useState(0)
  const [hasMoreAdvancedState, setHasMoreAdvancedState] = useState(true)
  const [isFetchingMoreAdvancedState, setIsFetchingMoreAdvancedState] = useState(false)
  const advancedTableRef = useRef<HTMLDivElement | null>(null)

  const featuredPlanets = useMemo(() => selectRandomPlanets(items), [items])
  const cacheKey = useMemo(
    () => buildAdvancedCacheKey(activeAdvancedTab, habitableMode, lastSearchTerm),
    [activeAdvancedTab, habitableMode, lastSearchTerm],
  )

  const detailEntry = useSelector((state: RootState) =>
    selectedPlanet ? state.exoplanets.details[selectedPlanet.pl_name] : undefined,
  )
  const cachedAdvancedRecord = useSelector(
    (state: RootState) => state.advancedResults.records[cacheKey],
  )
  const planetDetail = detailEntry?.data ?? null
  const planetDetailStatus = detailEntry?.status ?? 'idle'
  const planetDetailError = detailEntry?.error ?? null
  const activeAdvancedRecord = cachedAdvancedRecord ?? DEFAULT_ADVANCED_RECORD
  const advancedResults =
    advancedResultsState.length > 0 ? advancedResultsState : activeAdvancedRecord.items
  const advancedStatus = advancedStatusState !== 'idle' ? advancedStatusState : activeAdvancedRecord.status
  const advancedError = advancedErrorState ?? activeAdvancedRecord.error
  const advancedOffset =
    advancedOffsetState !== 0 ? advancedOffsetState : activeAdvancedRecord.offset
  const hasMoreAdvanced = hasMoreAdvancedState ?? activeAdvancedRecord.hasMore
  const isFetchingMoreAdvanced =
    isFetchingMoreAdvancedState || activeAdvancedRecord.status === 'loading'

  const handlePlanetSelect = useCallback((planet: Exoplanet) => {
    setSelectedPlanet((previous) =>
      previous?.pl_name === planet.pl_name ? { ...planet } : planet,
    )
    setIsTooltipOpen(true)
  }, [])

  const resetAdvancedState = useCallback(() => {
    setAdvancedResultsState([])
    setAdvancedStatusState('idle')
    setAdvancedErrorState(null)
    setAdvancedOffsetState(0)
    setHasMoreAdvancedState(true)
    setIsFetchingMoreAdvancedState(false)
  }, [])

  const clearAdvancedCache = useCallback(() => {
    dispatch(clearAdvancedRecord(cacheKey))
  }, [cacheKey, dispatch])

  const getAdvancedQuery = useCallback(
    (topCount: number, offset: number) => {
      if (activeAdvancedTab === 'earthlike') {
        return habitableMode !== 'off'
          ? buildHabitableZoneQuery(topCount, offset, habitableMode)
          : buildEarthlikeQuery(topCount)
      }
      if (activeAdvancedTab === 'distance') {
        return buildDistanceQuery(topCount)
      }
      if (activeAdvancedTab === 'search' && lastSearchTerm) {
        return buildPreciseSearchQuery(lastSearchTerm, topCount)
      }
      return null
    },
    [activeAdvancedTab, habitableMode, lastSearchTerm],
  )

  const fetchAdvancedData = useCallback(
    async (offset: number, append: boolean) => {
      const topCount = offset + ADVANCED_PAGE_SIZE
      const query = getAdvancedQuery(topCount, offset)
      const baseItems = append ? advancedResults : []

      if (!query) {
        dispatch(
          saveAdvancedRecord({
            key: cacheKey,
            record: {
              items: [],
              status: 'succeeded',
              error: null,
              offset: 0,
              hasMore: false,
            },
          }),
        )
        return
      }

      dispatch(
        saveAdvancedRecord({
          key: cacheKey,
          record: {
            items: baseItems,
            status: 'loading',
            error: null,
            offset,
            hasMore: true,
          },
        }),
      )

      try {
        const response = await fetch(buildTapUrl(query))
        if (!response.ok) {
          throw new Error(`NASA TAP error: ${response.status} ${response.statusText}`)
        }
        const payload = (await response.json()) as Record<string, unknown>[]
        const mapped = payload.map(transformExoplanetEntry)
        const pageItems = mapped.slice(offset, offset + ADVANCED_PAGE_SIZE)
        const nextResults = append ? [...baseItems, ...pageItems] : pageItems
        const nextOffset = offset + pageItems.length
        const nextHasMore = pageItems.length === ADVANCED_PAGE_SIZE

        dispatch(
          saveAdvancedRecord({
            key: cacheKey,
            record: {
              items: nextResults,
              status: 'succeeded',
              error: null,
              offset: nextOffset,
              hasMore: nextHasMore,
            },
          }),
        )
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'N/A'
        dispatch(
          saveAdvancedRecord({
            key: cacheKey,
            record: {
              items: baseItems,
              status: 'failed',
              error: message,
              offset,
              hasMore: true,
            },
          }),
        )
      }
    },
    [advancedResults, cacheKey, dispatch, getAdvancedQuery],
  )

  const handleAdvancedToggle = () => {
    setIsAdvancedMode((prev) => {
      const next = !prev
      if (next) {
        setActiveAdvancedTab('earthlike')
        setSearchTerm('')
        setLastSearchTerm('')
        setHabitableMode('off')
        resetAdvancedState()
        advancedTableRef.current?.scrollTo({ top: 0 })
      } else {
        resetAdvancedState()
        setSearchTerm('')
        setLastSearchTerm('')
        setActiveAdvancedTab('earthlike')
        setHabitableMode('off')
        advancedTableRef.current?.scrollTo({ top: 0 })
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
      dispatch(clearAdvancedRecord(cacheKey))
      await fetchAdvancedData(0, false)
      return
    }
    setActiveAdvancedTab('search')
    const nextKey = buildAdvancedCacheKey('search', habitableMode, trimmed)
    dispatch(clearAdvancedRecord(nextKey))
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

  const showHabitableScore = activeAdvancedTab === 'earthlike'

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

  useEffect(() => {
    advancedTableRef.current?.scrollTo({ top: 0 })
  }, [activeAdvancedTab, habitableMode, isAdvancedMode, lastSearchTerm])

  useEffect(() => {
    if (!isAdvancedMode) {
      resetAdvancedState()
      clearAdvancedCache()
      return
    }

    if (activeAdvancedTab === 'search' && !lastSearchTerm.trim()) {
      resetAdvancedState()
      clearAdvancedCache()
      return
    }

    if (cachedAdvancedRecord) {
      setAdvancedResultsState(cachedAdvancedRecord.items)
      setAdvancedStatusState(cachedAdvancedRecord.status as LoadStatus)
      setAdvancedErrorState(cachedAdvancedRecord.error)
      setAdvancedOffsetState(cachedAdvancedRecord.offset)
      setHasMoreAdvancedState(cachedAdvancedRecord.hasMore)
      setIsFetchingMoreAdvancedState(false)
      if (cachedAdvancedRecord.status === 'loading') {
        return
      }
      if (
        cachedAdvancedRecord.status === 'succeeded' ||
        cachedAdvancedRecord.status === 'failed'
      ) {
        return
      }
    } else {
      resetAdvancedState()
    }

    fetchAdvancedData(cachedAdvancedRecord?.offset ?? 0, Boolean(cachedAdvancedRecord))
  }, [
    activeAdvancedTab,
    cachedAdvancedRecord,
    clearAdvancedCache,
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

      <header className="overlay overlay--header">
        <div className="overlay__header-top">
          <div>
            <h1>{t('header.title')}</h1>
            <p>{t('header.description')}</p>
          </div>
          <div className="overlay__header-actions">
            <div className="language-switcher">
              <label htmlFor="language-select">{t('language.label')}</label>
              <select
                id="language-select"
                value={language}
                onChange={(event) => setLanguage(event.target.value as typeof language)}
              >
                <option value="en">{t('language.en')}</option>
                <option value="ru">{t('language.ru')}</option>
              </select>
            </div>
            <button type="button" className="advanced-toggle" onClick={handleAdvancedToggle}>
              {isAdvancedMode ? t('advanced.toggle.hide') : t('advanced.toggle.show')}
            </button>
          </div>
        </div>

        {isAdvancedMode && (
          <section className="advanced-panel">
            <form className="advanced-search" onSubmit={handleSearchSubmit}>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('advanced.search.placeholder')}
                aria-label={t('advanced.search.placeholder')}
              />
              <button type="submit">{t('advanced.search.button')}</button>
            </form>

            <div className="advanced-tabs" role="tablist">
              <button
                type="button"
                className={activeAdvancedTab === 'earthlike' ? 'is-active' : undefined}
                onClick={() => setActiveAdvancedTab('earthlike')}
                role="tab"
              >
                {t('advanced.tabs.earthlike')}
              </button>
              <button
                type="button"
                className={activeAdvancedTab === 'distance' ? 'is-active' : undefined}
                onClick={() => setActiveAdvancedTab('distance')}
                role="tab"
              >
                {t('advanced.tabs.distance')}
              </button>
            </div>

            <div className="advanced-results">
              {activeAdvancedTab === 'earthlike' && (
                <div className="advanced-radio-group">
                  <span>{t('advanced.earthlike.filterLabel')}</span>
                  <div className="advanced-radio-options" role="radiogroup">
                    {(['off', 'relaxed', 'strict'] as const).map((mode) => (
                      <label key={mode}>
                        <input
                          type="radio"
                          name="habitableMode"
                          value={mode}
                          checked={habitableMode === mode}
                          onChange={() => setHabitableMode(mode)}
                        />
                        {t(
                          mode === 'off'
                            ? 'advanced.earthlike.mode.off'
                            : mode === 'relaxed'
                              ? 'advanced.earthlike.mode.relaxed'
                              : 'advanced.earthlike.mode.strict',
                        )}
                      </label>
                    ))}
                  </div>
                  {habitableMode === 'strict' && (
                    <p className="advanced-hint">{t('advanced.earthlike.strictHint')}</p>
                  )}
                </div>
              )}
              {advancedStatus === 'loading' && (
                <p className="advanced-status">{t('advanced.status.fetching')}</p>
              )}
              {advancedStatus === 'failed' && advancedError && (
                <p className="advanced-status advanced-status--error">
                  {t('advanced.status.error', { error: advancedError })}
                </p>
              )}
              {activeAdvancedTab === 'search' && !lastSearchTerm && advancedStatus !== 'loading' && (
                <p className="advanced-status">{t('advanced.status.enterTerm')}</p>
              )}
              {advancedStatus === 'succeeded' &&
                advancedResults.length === 0 &&
                (activeAdvancedTab !== 'search' || lastSearchTerm) && (
                  <p className="advanced-status">{t('advanced.status.noResults')}</p>
                )}
              {activeAdvancedTab === 'search' && advancedResults.length > 0 && lastSearchTerm && (
                <p className="advanced-status">
                  {t('advanced.status.searchResults', { term: lastSearchTerm })}
                </p>
              )}
              {advancedResults.length > 0 && (
                <div
                  className="advanced-table-wrapper"
                  onScroll={handleAdvancedScroll}
                  ref={advancedTableRef}
                >
                  <table className="advanced-table">
                    <thead>
                      <tr>
                        <th>{t('advanced.table.planet')}</th>
                        {showHabitableScore && <th>{t('advanced.table.habitableScore')}</th>}
                        <th>{t('advanced.table.distance')}</th>
                        <th>{t('advanced.table.radius')}</th>
                        <th>{t('advanced.table.mass')}</th>
                        <th>{t('advanced.table.temperature')}</th>
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
                              <span>{planet.hostname ?? t('advanced.table.hostUnknown')}</span>
                            </td>
                            {showHabitableScore && (
                              <td>{formatAdvancedValue(planet.earth_like_score ?? null, 3)}</td>
                            )}
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
                <p className="advanced-status">{t('advanced.status.loadingMore')}</p>
              )}
              {!hasMoreAdvanced && advancedResults.length > 0 && (
                <p className="advanced-status">{t('advanced.status.endOfList')}</p>
              )}
            </div>
          </section>
        )}
      </header>

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
