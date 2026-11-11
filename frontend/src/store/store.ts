import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../slices/authSlice';
import riskFactorsReducer from '../slices/riskFactorsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    riskFactors: riskFactorsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: ['meta.arg'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;