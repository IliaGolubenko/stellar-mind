import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import type { Exoplanet } from '../types/exoplanet'

type LoadingStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface AdvancedRecord {
  items: Exoplanet[]
  status: LoadingStatus
  error: string | null
  offset: number
  hasMore: boolean
}

interface AdvancedResultsState {
  records: Record<string, AdvancedRecord>
}

const initialState: AdvancedResultsState = {
  records: {},
}

const advancedResultsSlice = createSlice({
  name: 'advancedResults',
  initialState,
  reducers: {
    saveAdvancedRecord(state, action: PayloadAction<{ key: string; record: AdvancedRecord }>) {
      state.records[action.payload.key] = action.payload.record
    },
    clearAdvancedRecord(state, action: PayloadAction<string>) {
      delete state.records[action.payload]
    },
  },
})

export const { saveAdvancedRecord, clearAdvancedRecord } = advancedResultsSlice.actions
export default advancedResultsSlice.reducer
