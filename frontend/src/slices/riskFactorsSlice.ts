import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { MOCK_RISK_FACTORS } from '../modules/mock';
import type { RiskFactor } from '../modules/mock';
import {
  getRiskFactorsApi,
  addRiskFactorApi,
  deleteRiskFactorApi,
  likeRiskFactorApi,
  publishRiskFactorApi,
} from '../api/riskFactorsApi';

interface RiskFactorsState {
  items: RiskFactor[];
  loading: boolean;
  maxAge: number;
  likedIds: number[];
}

const loadLikedIds = (): number[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem('likedIds') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLikedIds = (ids: number[]) => {
  localStorage.setItem('likedIds', JSON.stringify(ids));
};

const savedLikedIds = loadLikedIds();

const initialState: RiskFactorsState = {
  items: MOCK_RISK_FACTORS,
  loading: false,
  maxAge: 100,
  likedIds: savedLikedIds,
};

// 1. Получение списка факторов риска
export const fetchRiskFactorsThunk = createAsyncThunk(
  'riskFactors/fetch',
  async (maxAge: number | undefined) => {
    try {
      const res = await getRiskFactorsApi(maxAge);
      const data = res.data?.data;
      // Защита: если data не массив, возвращаем пустой массив
      return Array.isArray(data) ? data : [];
    } catch {
      console.log('🔄 Бэкенд недоступен, используем мок');
      return maxAge !== undefined
        ? MOCK_RISK_FACTORS.filter((f) => f.age <= maxAge)
        : MOCK_RISK_FACTORS;
    }
  }
);

// 2. Добавление фактора риска
export const addRiskFactorThunk = createAsyncThunk(
  'riskFactors/add',
  async (formData: FormData) => {
    try {
      const res = await addRiskFactorApi(formData);
      return res.data?.data;
    } catch {
      const item: RiskFactor = {
        id: Date.now(),
        name: (formData.get('name') as string) || '',
        description: (formData.get('description') as string) || '',
        age: Number(formData.get('age')) || 0,
        bmi: Number(formData.get('bmi')) || 0,
        image_url: '',
        video_url: '',
        likes_count: 0,
        status: 'published',
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        user_id: 1,
      };
      return item;
    }
  }
);

// 3. Публикация черновика
export const publishRiskFactorThunk = createAsyncThunk(
  'riskFactors/publish',
  async ({ id, formData }: { id: number; formData: FormData }) => {
    try {
      await publishRiskFactorApi(id, formData);
      return id;
    } catch {
      return id;
    }
  }
);

// 4. Удаление фактора риска
export const deleteRiskFactorThunk = createAsyncThunk(
  'riskFactors/delete',
  async (id: number) => {
    try {
      await deleteRiskFactorApi(id);
    } catch {}
    return id;
  }
);

// 5. Лайк/дизлайк
export const toggleLikeThunk = createAsyncThunk(
  'riskFactors/toggleLike',
  async ({ id, action }: { id: number; action: 0 | 1 }) => {
    try {
      await likeRiskFactorApi(id, action);
    } catch {}
    return { id, action };
  }
);

const riskFactorsSlice = createSlice({
  name: 'riskFactors',
  initialState,
  reducers: {
    setMaxAge: (state, action: PayloadAction<number>) => {
      state.maxAge = action.payload;
    },
    toggleLike: (state, action: PayloadAction<number>) => {
      const id = action.payload;
      const item = state.items.find((i) => i.id === id);
      const index = state.likedIds.indexOf(id);
      if (index > -1) {
        state.likedIds.splice(index, 1);
        if (item && item.likes_count > 0) item.likes_count -= 1;
      } else {
        state.likedIds.push(id);
        if (item) item.likes_count += 1;
      }
      saveLikedIds(state.likedIds);
    },
    resetRiskFactors: (state) => {
      state.items = MOCK_RISK_FACTORS;
      state.loading = false;
      state.maxAge = 100;
      state.likedIds = [];
      localStorage.removeItem('likedIds');
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchRiskFactorsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRiskFactorsThunk.fulfilled, (state, action) => {
        state.loading = false;
        // ЗАЩИТА: если payload не массив, оставляем старые данные
        if (Array.isArray(action.payload)) {
          state.items = action.payload;
        } else {
          console.warn('⚠️ Бэкенд вернул не массив:', action.payload);
        }
      })
      .addCase(fetchRiskFactorsThunk.rejected, (state) => {
        state.loading = false;
      })
      // Add
      .addCase(addRiskFactorThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(addRiskFactorThunk.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.items.push(action.payload);
        }
      })
      .addCase(addRiskFactorThunk.rejected, (state) => {
        state.loading = false;
      })
      // Publish
      .addCase(publishRiskFactorThunk.fulfilled, (state, action) => {
        const id = action.payload;
        const item = state.items.find((i) => i.id === id);
        if (item) {
          item.status = 'published';
        }
      })
      // Delete
      .addCase(deleteRiskFactorThunk.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload);
        state.likedIds = state.likedIds.filter((id) => id !== action.payload);
        saveLikedIds(state.likedIds);
      })
      // Toggle Like
      .addCase(toggleLikeThunk.fulfilled, (state, action) => {
        const { id, action: likeAction } = action.payload;
        const item = state.items.find((i) => i.id === id);
        if (item) {
          if (likeAction === 1) {
            if (!state.likedIds.includes(id)) {
              state.likedIds.push(id);
              item.likes_count += 1;
            }
          } else {
            const index = state.likedIds.indexOf(id);
            if (index > -1) {
              state.likedIds.splice(index, 1);
              if (item.likes_count > 0) item.likes_count -= 1;
            }
          }
          saveLikedIds(state.likedIds);
        }
      });
  },
});

export const { setMaxAge, toggleLike, resetRiskFactors } = riskFactorsSlice.actions;
export default riskFactorsSlice.reducer;