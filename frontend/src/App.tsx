import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { Footer } from './components/Layout/Footer';
import { Home } from './pages/Home';
import { Generate } from './pages/Generate';
import { Explore } from './pages/Explore';
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
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentCancel } from './pages/PaymentCancel';
import { OrderSuccess } from './pages/OrderSuccess';
import { ThumbnailTest } from './pages/ThumbnailTest';
import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-white">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/generate" element={<Generate />} />
              <Route path="/explore" element={<Explore />} />
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
              <Route path="/success" element={<PaymentSuccess />} />
              <Route path="/cancel" element={<PaymentCancel />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/thumbnail-test" element={<ThumbnailTest />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;