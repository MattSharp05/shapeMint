import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutSuccess(true);
      setTimeout(() => {
        setShowLogoutSuccess(false);
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (showLogoutSuccess) {
    return (
      <div className="fixed inset-0 bg-brand-dark flex items-center justify-center z-50">
        <div className="text-center animate-fade-in">
          <div className="bg-brand-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-brand-accent" />
          </div>
          <p className="text-lg font-medium text-white">Signed out</p>
        </div>
      </div>
    );
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 bg-brand-dark/90 backdrop-blur-md border-b border-white/5 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/images/shapemint-long-oneline.png"
              alt="ShapeMint"
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {user && (
              <Link
                to="/dashboard"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-white/10 text-brand-accent'
                    : 'text-[#9ca3af] hover:text-white hover:bg-white/5'
                }`}
              >
                My Models
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                  <User className="h-4 w-4 text-white/50" />
                  <span className="text-sm font-medium text-white">{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/sign-in"
                  className="px-4 py-2 text-sm font-medium text-[#9ca3af] hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/generate"
                  className="px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark rounded-full hover:shadow-[0_0_20px_rgba(237,174,73,0.4)] transition-all"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-white/60 hover:bg-white/5"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-brand-dark animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {user && (
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
              >
                My Models
              </Link>
            )}
            <div className="border-t border-white/5 pt-2 mt-2">
              {user ? (
                <button
                  onClick={() => { handleLogout(); setMobileOpen(false); }}
                  className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5"
                >
                  Sign Out
                </button>
              ) : (
                <>
                  <Link
                    to="/sign-in"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/generate"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-brand-accent to-brand-accent-dark text-brand-dark text-center mt-1"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
