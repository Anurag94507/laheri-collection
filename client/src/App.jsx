import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext.jsx';
import { useAuth } from './store/auth.js';
import SiteLayout from './components/SiteLayout.jsx';
import Toaster from './components/Toaster.jsx';
import Home from './pages/Home.jsx';
import Collections from './pages/Collections.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import TrackOrder from './pages/TrackOrder.jsx';
import Offers from './pages/Offers.jsx';
import SpinWheel from './pages/SpinWheel.jsx';
import PuzzleGame from './pages/PuzzleGame.jsx';
import ChatbotPage from './pages/ChatbotPage.jsx';
import NotFound from './pages/NotFound.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import Billing from './pages/admin/Billing.jsx';
import Customers from './pages/admin/Customers.jsx';
import BulkSend from './pages/admin/BulkSend.jsx';
import Orders from './pages/admin/Orders.jsx';
import GamesAdmin from './pages/admin/GamesAdmin.jsx';
import SettingsAdmin from './pages/admin/SettingsAdmin.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}

function RequireAdmin({ children }) {
  const { user, checked, check } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!checked) check();
  }, [checked, check]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          <p className="text-xs uppercase tracking-[0.24em] text-ink/40">Checking session</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return children;
}

export default function App() {
  return (
    <SettingsProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/collections/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/track/:orderId" element={<TrackOrder />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/spin-wheel" element={<SpinWheel />} />
          <Route path="/puzzle" element={<PuzzleGame />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="billing" element={<Billing />} />
          <Route path="customers" element={<Customers />} />
          <Route path="bulk-send" element={<BulkSend />} />
          <Route path="orders" element={<Orders />} />
          <Route path="games" element={<GamesAdmin />} />
          <Route path="settings" element={<SettingsAdmin />} />
        </Route>
      </Routes>
      <Toaster />
    </SettingsProvider>
  );
}
