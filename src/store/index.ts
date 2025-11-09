import { configureStore } from '@reduxjs/toolkit'

import exoplanetsReducer from './exoplanetsSlice'
import advancedResultsReducer from './advancedResultsSlice'

export const store = configureStore({
  reducer: {
    exoplanets: exoplanetsReducer,
    advancedResults: advancedResultsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
