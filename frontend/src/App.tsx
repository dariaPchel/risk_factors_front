import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Layout } from './components/Layout';
import { FeedPage } from './pages/FeedPage';
import { GridPage } from './pages/GridPage';
import { AddPage } from './pages/AddPage';
import { LoginPage } from './pages/LoginPage';
import { fetchRiskFactorsThunk } from './slices/riskFactorsSlice';
import { restoreAuth } from './slices/authSlice';
import type { AppDispatch } from './store/store';

function App() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // ✅ Восстанавливаем авторизацию из localStorage
    dispatch(restoreAuth());
    // ✅ Загружаем данные с бэкенда
    dispatch(fetchRiskFactorsThunk(undefined));
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/risk_factors_feed/1" replace />} />
          <Route path="/risk_factors_feed/:id" element={<FeedPage />} />
          <Route path="/risk_factors_grid" element={<GridPage />} />
          <Route path="/risk_factors_add" element={<AddPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;