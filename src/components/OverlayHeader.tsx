import {
  FormEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'

import AdvancedPanel, {
  useAdvancedPanelDataSync,
  useAdvancedPanelScrollReset,
  type TranslateFn,
} from './AdvancedPanel'
import type { Language } from '../i18n/translations'
import type { Exoplanet } from '../types/exoplanet'
import type { HabitableStrictness } from '../utils/constants'
import {
  buildDistanceQuery,
  buildEarthlikeQuery,
  buildHabitableZoneQuery,
  buildPreciseSearchQuery,
  buildTapUrl,
} from '../utils/constants'
import { transformExoplanetEntry } from '../utils/exoplanets'
import { saveAdvancedRecord, clearAdvancedRecord } from '../store/advancedResultsSlice'
import type { RootState, AppDispatch } from '../store'
import type { AdvancedTab, LoadStatus } from '../types/advanced'

const ADVANCED_PAGE_SIZE = 25

type HabitableMode = HabitableStrictness | 'off'

const buildAdvancedCacheKey = (
  tab: AdvancedTab,
  mode: HabitableMode,
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

interface OverlayHeaderProps {
  t: TranslateFn
  language: Language
  setLanguage: (language: Language) => void
  onPlanetSelect: (planet: Exoplanet) => void
}

const OverlayHeader = ({ t, language, setLanguage, onPlanetSelect }: OverlayHeaderProps) => {
  const dispatch = useDispatch<AppDispatch>()
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)
  const [activeAdvancedTab, setActiveAdvancedTab] = useState<AdvancedTab>('earthlike')
  const [advancedResultsState, setAdvancedResultsState] = useState<Exoplanet[]>([])
  const [advancedStatusState, setAdvancedStatusState] = useState<LoadStatus>('idle')
  const [advancedErrorState, setAdvancedErrorState] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [lastSearchTerm, setLastSearchTerm] = useState('')
  const [habitableMode, setHabitableMode] = useState<HabitableMode>('off')
  const [advancedOffsetState, setAdvancedOffsetState] = useState(0)
  const [hasMoreAdvancedState, setHasMoreAdvancedState] = useState(true)
  const [isFetchingMoreAdvancedState, setIsFetchingMoreAdvancedState] = useState(false)
  const advancedTableRef = useRef<HTMLDivElement | null>(null)

  const cacheKey = useMemo(
    () => buildAdvancedCacheKey(activeAdvancedTab, habitableMode, lastSearchTerm),
    [activeAdvancedTab, habitableMode, lastSearchTerm],
  )

  const cachedAdvancedRecord = useSelector(
    (state: RootState) => state.advancedResults.records[cacheKey],
  )

  const activeAdvancedRecord = cachedAdvancedRecord ?? DEFAULT_ADVANCED_RECORD
  const advancedResults =
    advancedResultsState.length > 0 ? advancedResultsState : activeAdvancedRecord.items
  const advancedStatus =
    advancedStatusState !== 'idle' ? advancedStatusState : activeAdvancedRecord.status
  const advancedError = advancedErrorState ?? activeAdvancedRecord.error
  const advancedOffset =
    advancedOffsetState !== 0 ? advancedOffsetState : activeAdvancedRecord.offset
  const hasMoreAdvanced = hasMoreAdvancedState ?? activeAdvancedRecord.hasMore
  const isFetchingMoreAdvanced =
    isFetchingMoreAdvancedState || activeAdvancedRecord.status === 'loading'

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

  const handleAdvancedLoadMore = useCallback(() => {
    fetchAdvancedData(advancedOffset, true)
  }, [advancedOffset, fetchAdvancedData])

  useAdvancedPanelScrollReset({
    tableRef: advancedTableRef,
    activeTab: activeAdvancedTab,
    habitableMode,
    isVisible: isAdvancedMode,
    lastSearchTerm,
  })

  useAdvancedPanelDataSync({
    isAdvancedMode,
    activeTab: activeAdvancedTab,
    lastSearchTerm,
    cachedAdvancedRecord,
    resetAdvancedState,
    clearAdvancedCache,
    setAdvancedResultsState,
    setAdvancedStatusState,
    setAdvancedErrorState,
    setAdvancedOffsetState,
    setHasMoreAdvancedState,
    setIsFetchingMoreAdvancedState,
    fetchAdvancedData,
  })

  return (
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
              onChange={(event) => setLanguage(event.target.value as Language)}
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

      <AdvancedPanel
        isVisible={isAdvancedMode}
        t={t}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearchSubmit={handleSearchSubmit}
        activeTab={activeAdvancedTab}
        onTabChange={setActiveAdvancedTab}
        habitableMode={habitableMode}
        onHabitableModeChange={setHabitableMode}
        status={advancedStatus}
        error={advancedError}
        lastSearchTerm={lastSearchTerm}
        results={advancedResults}
        tableRef={advancedTableRef}
        onPlanetSelect={onPlanetSelect}
        isFetchingMore={isFetchingMoreAdvanced}
        hasMore={hasMoreAdvanced}
        onLoadMore={handleAdvancedLoadMore}
      />
    </header>
  )
}

export default OverlayHeader
