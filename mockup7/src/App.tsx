import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { Footer } from './components/Layout/Footer';
import { Home } from './pages/Home';
import { Generate } from './pages/Generate';
import { Marketplace } from './pages/Marketplace';
import { Manufacturing } from './pages/Manufacturing';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Order } from './pages/Order';
import { DownloadCheckout } from './pages/DownloadCheckout';
import { MarketplaceUpload } from './pages/MarketplaceUpload';
import { DesignDetails } from './pages/DesignDetails';
import { UserProfile } from './pages/UserProfile';
import { OrderSummary } from './pages/OrderSummary';
import { DownloadConfirmation } from './pages/DownloadConfirmation';
import { Explore } from './pages/Explore';
import { ContactUs } from './pages/ContactUs';
import { About } from './pages/About';

function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <ScrollToTop />
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/manufacturing" element={<Manufacturing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/order" element={<Order />} />
            <Route path="/download-checkout" element={<DownloadCheckout />} />
            <Route path="/marketplace-upload" element={<MarketplaceUpload />} />
            <Route path="/design/:id" element={<DesignDetails />} />
            <Route path="/creator/:username" element={<UserProfile />} />
            <Route path="/order-summary" element={<OrderSummary />} />
            <Route path="/download-confirmation" element={<DownloadConfirmation />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/contact" element={<ContactUs />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;