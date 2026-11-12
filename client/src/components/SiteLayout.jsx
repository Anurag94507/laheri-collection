import { Outlet } from 'react-router-dom';
import ChatWidget from './ChatWidget.jsx';
import Footer from './Footer.jsx';
import MobileNav from './MobileNav.jsx';
import Navbar from './Navbar.jsx';

export default function SiteLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      <ChatWidget />
    </div>
  );
}
