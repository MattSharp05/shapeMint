import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;