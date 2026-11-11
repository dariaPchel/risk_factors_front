import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginApi } from '../api/riskFactorsApi';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: { id: number; email: string } | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  user: null,
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await loginApi(credentials);
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Ошибка входа');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // ✅ Просто очищаем localStorage, без запроса к бэкенду
      localStorage.removeItem('token');
      return;
    } catch (err: any) {
      return rejectWithValue('Ошибка выхода');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    restoreAuth: (state) => {
      const token = localStorage.getItem('token');
      if (token) {
        state.isAuthenticated = true;
        state.token = token;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.token = action.payload.access_token;
        localStorage.setItem('token', action.payload.access_token);
      })
      .addCase(loginUser.rejected, (state) => {
        state.isAuthenticated = false;
        state.token = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      });
  },
});

export const { restoreAuth } = authSlice.actions;
export default authSlice.reducer;