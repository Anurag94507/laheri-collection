import { Outlet, useLocation } from 'react-router-dom';
import ChatWidget from './ChatWidget.jsx';
import Footer from './Footer.jsx';
import MobileNav from './MobileNav.jsx';
import Navbar from './Navbar.jsx';
import BackToTop from './BackToTop.jsx';
import WhatsAppFloat from './WhatsAppFloat.jsx';

export default function SiteLayout() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <MobileNav />
      <ChatWidget />
      <WhatsAppFloat />
      <BackToTop />
      {pathname === '/' && <span className="sr-only">Laheri Collection — dressed for every occasion</span>}
    </div>
  );
}
