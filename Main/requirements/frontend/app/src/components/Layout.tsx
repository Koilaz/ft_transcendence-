// @ts-nocheck
import { Outlet } from 'react-router-dom';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
