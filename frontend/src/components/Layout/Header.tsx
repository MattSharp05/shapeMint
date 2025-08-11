import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, User, ShoppingBag, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              ShapeMint
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/generate"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              Generate
            </Link>
            <Link
              to="/explore"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              Explore
            </Link>
            <Link
              to="/marketplace"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              Marketplace
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
              >
                My Account
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-700 hidden sm:inline">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}