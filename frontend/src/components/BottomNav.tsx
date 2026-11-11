import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import type { RootState, AppDispatch } from '../store/store';
import { logoutUser } from '../slices/authSlice';
import { resetRiskFactors, fetchRiskFactorsThunk } from '../slices/riskFactorsSlice';
import { logoutApi } from '../api/riskFactorsApi';
import feedIcon from '../assets/feed.jpg';
import feedIconActive from '../assets/hover-feed.jpg';
import addIcon from '../assets/add.jpg';
import gridIcon from '../assets/grid.jpg';
import gridIconActive from '../assets/hover-grid.jpg';
import keyIcon from '../assets/key.png';
import keyHoverIcon from '../assets/key_hover.png';

const ICONS = {
  feed: { normal: feedIcon, active: feedIconActive },
  add: { normal: addIcon, active: addIcon },
  grid: { normal: gridIcon, active: gridIconActive },
};

interface NavIconProps {
  name: keyof typeof ICONS;
  alt: string;
  active?: boolean;
}

const NavIcon = ({ name, alt, active }: NavIconProps) => (
  <img src={active ? ICONS[name].active : ICONS[name].normal} alt={alt} />
);

export const BottomNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isKeyHovered, setIsKeyHovered] = useState(false);

  const feedActive = pathname.startsWith('/risk_factors_feed');
  const gridActive = pathname.startsWith('/risk_factors_grid');
  const loginActive = pathname === '/login';

  const handleLogout = async () => {
    try {
      await logoutApi(); // токен уходит в блеклист на бэкенде (пока он ещё в localStorage)
    } catch {
      // бэкенд недоступен — выходим локально
    }
  dispatch(logoutUser())
    dispatch(resetRiskFactors());
    dispatch(fetchRiskFactorsThunk(100)); // перезагрузка списка уже как гость
    navigate('/login');
  };

  return (
    <nav className="bottom-nav">
      <Link to="/risk_factors_feed/1" className={`nav-item ${feedActive ? 'active' : ''}`}>
        <NavIcon name="feed" alt="Лента" active={feedActive} />
        <span>Лента</span>
      </Link>

      {isAuthenticated ? (
        <Link to="/risk_factors_add" className={`nav-item ${pathname.startsWith('/risk_factors_add') ? 'active' : ''}`}>
          <NavIcon name="add" alt="Добавить" />
          <span>Добавить</span>
        </Link>
      ) : (
        <div className="nav-item disabled" aria-disabled="true">
          <NavIcon name="add" alt="Добавить" />
          <span>Добавить</span>
        </div>
      )}

      <Link to="/risk_factors_grid" className={`nav-item ${gridActive ? 'active' : ''}`}>
        <NavIcon name="grid" alt="Плитка" active={gridActive} />
        <span>Плитка</span>
      </Link>

      {isAuthenticated ? (
        <div
          className="nav-item"
          onClick={handleLogout}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setIsKeyHovered(true)}
          onMouseLeave={() => setIsKeyHovered(false)}
        >
          <img src={isKeyHovered ? keyHoverIcon : keyIcon} alt="Выход" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span>Выход</span>
        </div>
      ) : (
        <Link
          to="/login"
          className={`nav-item ${loginActive ? 'active' : ''}`}
          onMouseEnter={() => setIsKeyHovered(true)}
          onMouseLeave={() => setIsKeyHovered(false)}
        >
          <img src={isKeyHovered ? keyHoverIcon : keyIcon} alt="Вход" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span>Вход</span>
        </Link>
      )}
    </nav>
  );
};