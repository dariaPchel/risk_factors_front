import logo from '../assets/logo.jpg';

export const Header = () => (
  <header className="header">
    <img src={logo} alt="МЕДСИ" className="logo-img" />
    <svg className="menu-btn" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  </header>
);