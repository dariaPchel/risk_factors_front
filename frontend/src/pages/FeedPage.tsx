import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { toggleLikeThunk } from '../slices/riskFactorsSlice';
import avatar from '../assets/favicon.jpg';

const DEFAULT_IMAGE = '/default-photo.png';
const DEFAULT_VIDEO = '/default_video.mp4';

export const FeedPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { items, likedIds } = useSelector((state: RootState) => state.riskFactors);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [showFullDescription, setShowFullDescription] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  // ЗАЩИТА: если items не массив, используем пустой
  const safeItems = Array.isArray(items) ? items : [];
  const currentIndex = Math.max(0, safeItems.findIndex((f) => f.id === Number(id)));
  const factor = safeItems[currentIndex];

  useEffect(() => {
    setShowFullDescription(false);
    setVideoFailed(false);
  }, [id]);

  if (!factor) return <div style={{ padding: 20, color: 'white' }}>Карточка не найдена</div>;

  const goTo = (index: number) => {
    const total = safeItems.length;
    navigate(`/risk_factors_feed/${safeItems[(index + total) % total].id}`);
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      alert('Войдите в систему, чтобы ставить лайки');
      return;
    }
    const isCurrentlyLiked = likedIds.includes(factor.id);
    dispatch(toggleLikeThunk({ 
      id: factor.id, 
      action: isCurrentlyLiked ? 0 : 1 
    }));
  };

  const isLiked = likedIds.includes(factor.id);
  const poster = factor.image_url || DEFAULT_IMAGE;
  const videoSrc = factor.video_url || DEFAULT_VIDEO;

  return (
    <div className="feed-container">
      {videoFailed ? (
        <img className="video-background" src={poster} alt="" />
      ) : (
        <video
          key={videoSrc}
          className="video-background"
          src={videoSrc}
          poster={poster}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoFailed(true)}
        />
      )}
      <div className="video-overlay"></div>
      <div className="feed-content">
        <div className="author-row">
          <img src={avatar} alt="МЕДСИ" className="author-avatar" />
          <span className="author-name">МЕДСИ</span>
        </div>
        <div className="feed-header-row">
          <div>
            <h1 className="feed-title">{factor.name}</h1>
            <h2 className="feed-subtitle">Фактор риска</h2>
          </div>
          <div
            className="likes-container"
            onClick={handleLike}
            style={{ cursor: isAuthenticated ? 'pointer' : 'not-allowed', opacity: isAuthenticated ? 1 : 0.6 }}
          >
            <svg className="like-icon" viewBox="0 0 24 24" style={{ fill: isLiked ? '#FF4757' : '#FFFFFF' }}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="likes-count">{factor.likes_count}</span>
          </div>
        </div>
        <div className="feed-bottom-row">
          <div className="feed-description">
            <div className={`description-text ${showFullDescription ? 'expanded' : ''}`}>
              {factor.description}
            </div>
            <button
              type="button"
              className="more-toggle-label"
              onClick={() => setShowFullDescription((v) => !v)}
            >
              {showFullDescription ? 'скрыть' : 'ещё'}
            </button>
          </div>
          <div className="feed-params">
            <div className="param-item">
              <span className="param-label">Возраст</span>
              <span className="param-value">{factor.age} лет</span>
            </div>
            <div className="param-item">
              <span className="param-label">ИМТ</span>
              <span className="param-value">{factor.bmi}</span>
            </div>
          </div>
        </div>
      </div>
      <button type="button" className="nav-up-corner" onClick={() => goTo(currentIndex - 1)} aria-label="Предыдущая">
        <svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" /></svg>
      </button>
      <button type="button" className="nav-down-corner" onClick={() => goTo(currentIndex + 1)} aria-label="Следующая">
        <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" /></svg>
      </button>
    </div>
  );
};