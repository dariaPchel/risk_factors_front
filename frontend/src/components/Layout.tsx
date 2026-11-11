import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

// Общий каркас: шапка + содержимое страницы + нижняя навигация
export const Layout = () => (
  <>
    <Header />
    <main>
      <Outlet />
    </main>
    <BottomNav />
  </>
);
