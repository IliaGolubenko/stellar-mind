import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import { NASA_EXOPLANETS_URL } from '../utils/constants'
import type { Exoplanet } from '../types/exoplanet'

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

const toNullableString = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return String(value)
}

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

const transformEntry = (entry: Record<string, unknown>): Exoplanet => ({
  pl_name: String(entry.pl_name ?? 'Unknown'),
  hostname: toNullableString(entry.hostname),
  discoverymethod: toNullableString(entry.discoverymethod),
  disc_year: toNullableNumber(entry.disc_year),
  pl_orbper: toNullableNumber(entry.pl_orbper),
  pl_rade: toNullableNumber(entry.pl_rade),
  pl_bmasse: toNullableNumber(entry.pl_bmasse),
  pl_insol: toNullableNumber(entry.pl_insol),
  pl_dens: toNullableNumber(entry.pl_dens),
  pl_eqt: toNullableNumber(entry.pl_eqt),
  pl_orbsmax: toNullableNumber(entry.pl_orbsmax),
  st_spectype: toNullableString(entry.st_spectype),
  st_teff: toNullableNumber(entry.st_teff),
  st_rad: toNullableNumber(entry.st_rad),
  st_mass: toNullableNumber(entry.st_mass),
  st_lum: toNullableNumber(entry.st_lum),
})

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

      return payload.map(transformEntry)
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
