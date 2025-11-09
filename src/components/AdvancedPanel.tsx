import { FormEvent, UIEvent, useCallback, useEffect } from 'react'
import type { MutableRefObject } from 'react'

import type { Exoplanet } from '../types/exoplanet'
import type { HabitableStrictness } from '../utils/constants'
import type { AdvancedTab, LoadStatus } from '../types/advanced'

export type TranslateFn = (key: string, options?: Record<string, string | number>) => string

type HabitableMode = HabitableStrictness | 'off'

export interface AdvancedPanelProps {
  isVisible: boolean
  t: TranslateFn
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void
  activeTab: AdvancedTab
  onTabChange: (tab: AdvancedTab) => void
  habitableMode: HabitableMode
  onHabitableModeChange: (mode: HabitableMode) => void
  status: LoadStatus
  error: string | null
  lastSearchTerm: string
  results: Exoplanet[]
  tableRef: MutableRefObject<HTMLDivElement | null>
  onPlanetSelect: (planet: Exoplanet) => void
  isFetchingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
}

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

const AdvancedPanel = ({
  isVisible,
  t,
  searchTerm,
  onSearchTermChange,
  onSearchSubmit,
  activeTab,
  onTabChange,
  habitableMode,
  onHabitableModeChange,
  status,
  error,
  lastSearchTerm,
  results,
  tableRef,
  onPlanetSelect,
  isFetchingMore,
  hasMore,
  onLoadMore,
}: AdvancedPanelProps) => {
  const showHabitableScore = activeTab === 'earthlike'

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!isVisible || !hasMore || isFetchingMore || status === 'loading') {
        return
      }

      const target = event.currentTarget
      const threshold = 24
      if (target.scrollTop + target.clientHeight >= target.scrollHeight - threshold) {
        onLoadMore()
      }
    },
    [hasMore, isFetchingMore, isVisible, onLoadMore, status],
  )

  if (!isVisible) {
    return null
  }

  return (
    <section className="advanced-panel">
      <form className="advanced-search" onSubmit={onSearchSubmit}>
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder={t('advanced.search.placeholder')}
          aria-label={t('advanced.search.placeholder')}
        />
        <button type="submit">{t('advanced.search.button')}</button>
      </form>

      <div className="advanced-tabs" role="tablist">
        <button
          type="button"
          className={activeTab === 'earthlike' ? 'is-active' : undefined}
          onClick={() => onTabChange('earthlike')}
          role="tab"
        >
          {t('advanced.tabs.earthlike')}
        </button>
        <button
          type="button"
          className={activeTab === 'distance' ? 'is-active' : undefined}
          onClick={() => onTabChange('distance')}
          role="tab"
        >
          {t('advanced.tabs.distance')}
        </button>
      </div>

      <div className="advanced-results">
        {activeTab === 'earthlike' && (
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
                    onChange={() => onHabitableModeChange(mode)}
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
            {habitableMode === 'strict' && <p className="advanced-hint">{t('advanced.earthlike.strictHint')}</p>}
          </div>
        )}
        {status === 'loading' && <p className="advanced-status">{t('advanced.status.fetching')}</p>}
        {status === 'failed' && error && (
          <p className="advanced-status advanced-status--error">
            {t('advanced.status.error', { error })}
          </p>
        )}
        {activeTab === 'search' && !lastSearchTerm && status !== 'loading' && (
          <p className="advanced-status">{t('advanced.status.enterTerm')}</p>
        )}
        {status === 'succeeded' && results.length === 0 && (activeTab !== 'search' || lastSearchTerm) && (
          <p className="advanced-status">{t('advanced.status.noResults')}</p>
        )}
        {activeTab === 'search' && results.length > 0 && lastSearchTerm && (
          <p className="advanced-status">
            {t('advanced.status.searchResults', { term: lastSearchTerm })}
          </p>
        )}
        {results.length > 0 && (
          <div className="advanced-table-wrapper" onScroll={handleScroll} ref={tableRef}>
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
                {results.map((planet) => (
                  <tr
                    key={`${planet.pl_name}-${planet.hostname ?? 'host'}`}
                    tabIndex={0}
                    onClick={() => onPlanetSelect(planet)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onPlanetSelect(planet)
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
        {isFetchingMore && <p className="advanced-status">{t('advanced.status.loadingMore')}</p>}
        {!hasMore && results.length > 0 && (
          <p className="advanced-status">{t('advanced.status.endOfList')}</p>
        )}
      </div>
    </section>
  )
}

export default AdvancedPanel

interface AdvancedRecordSnapshot {
  items: Exoplanet[]
  status: LoadStatus
  error: string | null
  offset: number
  hasMore: boolean
}

export const useAdvancedPanelScrollReset = ({
  tableRef,
  activeTab,
  habitableMode,
  isVisible,
  lastSearchTerm,
}: {
  tableRef: MutableRefObject<HTMLDivElement | null>
  activeTab: AdvancedTab
  habitableMode: HabitableMode
  isVisible: boolean
  lastSearchTerm: string
}) => {
  useEffect(() => {
    if (!isVisible) return
    tableRef.current?.scrollTo({ top: 0 })
  }, [activeTab, habitableMode, isVisible, lastSearchTerm, tableRef])
}

export const useAdvancedPanelDataSync = ({
  isAdvancedMode,
  activeTab,
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
}: {
  isAdvancedMode: boolean
  activeTab: AdvancedTab
  lastSearchTerm: string
  cachedAdvancedRecord?: AdvancedRecordSnapshot
  resetAdvancedState: () => void
  clearAdvancedCache: () => void
  setAdvancedResultsState: (items: Exoplanet[]) => void
  setAdvancedStatusState: (status: LoadStatus) => void
  setAdvancedErrorState: (error: string | null) => void
  setAdvancedOffsetState: (offset: number) => void
  setHasMoreAdvancedState: (hasMore: boolean) => void
  setIsFetchingMoreAdvancedState: (value: boolean) => void
  fetchAdvancedData: (offset: number, append: boolean) => void
}) => {
  useEffect(() => {
    if (!isAdvancedMode) {
      resetAdvancedState()
      clearAdvancedCache()
      return
    }

    if (activeTab === 'search' && !lastSearchTerm.trim()) {
      resetAdvancedState()
      clearAdvancedCache()
      return
    }

    if (cachedAdvancedRecord) {
      setAdvancedResultsState(cachedAdvancedRecord.items)
      setAdvancedStatusState(cachedAdvancedRecord.status)
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
    activeTab,
    cachedAdvancedRecord,
    clearAdvancedCache,
    fetchAdvancedData,
    isAdvancedMode,
    lastSearchTerm,
    resetAdvancedState,
    setAdvancedErrorState,
    setHasMoreAdvancedState,
    setAdvancedOffsetState,
    setAdvancedResultsState,
    setAdvancedStatusState,
    setIsFetchingMoreAdvancedState,
  ])
}
