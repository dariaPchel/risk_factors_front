import { Card } from 'react-bootstrap';
import type { RiskFactor } from '../modules/mock';

const DEFAULT_IMAGE = '/default-photo.png';

interface RiskCardProps {
  factor: RiskFactor;
  onClick: (id: number) => void;
  isLiked?: boolean;
}

export const RiskCard = ({ factor, onClick, isLiked = false }: RiskCardProps) => (
  <Card className="grid-card" onClick={() => onClick(factor.id)}>
    <Card.Img
      variant="top"
      src={factor.image_url || DEFAULT_IMAGE}
      alt={factor.name}
      className="grid-card-image"
    />
    <Card.Body className="grid-card-content">
      <Card.Title as="h3" className="grid-card-title">
        {factor.name}
      </Card.Title>
      <div className="grid-card-footer">
        <div className="card-likes">
          <svg viewBox="0 0 24 24" style={{ fill: isLiked ? '#FF4757' : 'currentColor' }}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          <span style={{ color: isLiked ? '#FF4757' : '#999' }}>{factor.likes_count}</span>
        </div>
      </div>
    </Card.Body>
  </Card>
);