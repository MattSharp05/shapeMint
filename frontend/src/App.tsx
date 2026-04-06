import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Layout/Header';
import { Footer } from './components/Layout/Footer';
import { Home } from './pages/Home';
import { Generate } from './pages/Generate';
import { Manufacturing } from './pages/Manufacturing';
import { Dashboard } from './pages/Dashboard';
import { SignIn } from './pages/SignIn';
import { ResetPassword } from './pages/ResetPassword';
import { ModelResult } from './pages/ModelResult';
import { DownloadCheckout } from './pages/DownloadCheckout';
import { DesignDetails } from './pages/DesignDetails';
import { UserProfile } from './pages/UserProfile';
import { PaymentSuccess } from './pages/PaymentSuccess';
import { PaymentCancel } from './pages/PaymentCancel';
import { OrderSuccess } from './pages/OrderSuccess';
import { ThumbnailTest } from './pages/ThumbnailTest';
import { TestingEnv } from './pages/TestingEnv';
import { CreatePage } from './pages/CreatePage';
import { LandingPrintMyPet } from './pages/LandingPrintMyPet';
import { LandingCakeTopper } from './pages/LandingCakeTopper';
import { LandingStatueBust } from './pages/LandingStatueBust';
import { AuthProvider } from './hooks/useAuth';

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen bg-white">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/generate" element={<Generate />} />
              <Route path="/create/:printType" element={<CreatePage />} />
              <Route path="/manufacturing" element={<Manufacturing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sign-in" element={<SignIn />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/model/:id" element={<ModelResult />} />
              <Route path="/download-checkout" element={<DownloadCheckout />} />
              <Route path="/design/:id" element={<DesignDetails />} />
              <Route path="/creator/:username" element={<UserProfile />} />
              <Route path="/success" element={<PaymentSuccess />} />
              <Route path="/cancel" element={<PaymentCancel />} />
              <Route path="/order-success" element={<OrderSuccess />} />
              <Route path="/thumbnail-test" element={<ThumbnailTest />} />
              <Route path="/testing-env" element={<TestingEnv />} />
              <Route path="/landing/print-my-pet" element={<LandingPrintMyPet />} />
              <Route path="/landing/cake-topper" element={<LandingCakeTopper />} />
              <Route path="/landing/statue-bust" element={<LandingStatueBust />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;