import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Spinner } from 'react-bootstrap';
import type { RootState, AppDispatch } from '../store/store';
import {
  fetchRiskFactorsThunk,
  deleteRiskFactorThunk,
  setMaxAge,
} from '../slices/riskFactorsSlice';
import { AgeFilter } from '../components/AgeFilter';
import { RiskCard } from '../components/RiskCard';

export const GridPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { items, loading, maxAge, likedIds } = useSelector(
    (state: RootState) => state.riskFactors
  );
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Локальное состояние для ползунка (пока не нажали "Применить")
  const [tempMaxAge, setTempMaxAge] = useState(maxAge);

  // Загружаем данные ТОЛЬКО при первом монтировании
  useEffect(() => {
    dispatch(fetchRiskFactorsThunk(maxAge));
  }, []); 

  const handleApply = () => {
    dispatch(setMaxAge(tempMaxAge));
    dispatch(fetchRiskFactorsThunk(tempMaxAge));
  };

  const handleCardClick = (id: number) => {
    navigate(`/risk_factors_feed/${id}`);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Удалить карточку?')) {
      dispatch(deleteRiskFactorThunk(id));
    }
  };

  return (
    <div className="grid-container">
      <AgeFilter
        maxAge={tempMaxAge}
        onChange={(value) => setTempMaxAge(value)}
        onApply={handleApply}
      />

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spinner animation="border" style={{ color: '#00ABAA' }} />
        </div>
      )}

      <div className="grid-cards">
        {!loading && items.length === 0 && (
          <p className="grid-empty">Нет карточек для возраста до {maxAge} лет</p>
        )}
        {!loading &&
          items.map((factor) => (
            <div key={factor.id} className="grid-card-wrapper">
              <RiskCard
                factor={factor}
                onClick={handleCardClick}
                isLiked={likedIds.includes(factor.id)}
              />
              
              {/* Кнопка удаления только для автора карточки (is_creator === 1) */}
              {isAuthenticated && factor.is_creator === 1 && (
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(factor.id)}
                >
                  Удалить
                </button>
              )}
              
            </div>
          ))}
      </div>
    </div>
  );
};