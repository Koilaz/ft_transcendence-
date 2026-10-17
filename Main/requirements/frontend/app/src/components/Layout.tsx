// @ts-nocheck
import { Outlet, useLocation } from 'react-router-dom';
import Footer from './Footer';

export default function Layout() {
  const location = useLocation();
  const isGamePage = location.pathname.startsWith('/game');

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <Outlet />
      </main>
      {!isGamePage && <Footer />}
    </div>
  );
}
