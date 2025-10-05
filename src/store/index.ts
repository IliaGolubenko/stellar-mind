import { configureStore } from '@reduxjs/toolkit';

import exoplanetsReducer from './exoplanetsSlice';

export const store = configureStore({
  reducer: {
    exoplanets: exoplanetsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
