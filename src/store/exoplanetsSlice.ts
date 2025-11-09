import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import { NASA_EXOPLANETS_URL } from '../utils/constants'
import type { Exoplanet } from '../types/exoplanet'
import { transformExoplanetEntry } from '../utils/exoplanets'

type LoadingStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface ExoplanetsState {
  items: Exoplanet[]
  status: LoadingStatus
  error: string | null
}

const initialState: ExoplanetsState = {
  items: [],
  status: 'idle',
  error: null,
}

export const fetchExoplanets = createAsyncThunk<Exoplanet[], void, { rejectValue: string }>(
  'exoplanets/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(NASA_EXOPLANETS_URL)

      if (!response.ok) {
        return rejectWithValue(
          `Failed to load exoplanets: ${response.status} ${response.statusText}`,
        )
      }

      const payload = (await response.json()) as Record<string, unknown>[]

      return payload.map(transformExoplanetEntry)
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue(error.message)
      }

      return rejectWithValue('Unknown error while fetching exoplanets')
    }
  },
)

const exoplanetsSlice = createSlice({
  name: 'exoplanets',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExoplanets.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchExoplanets.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchExoplanets.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unexpected error fetching exoplanets'
      })
  },
})

export default exoplanetsSlice.reducer
