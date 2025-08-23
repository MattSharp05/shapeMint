import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, User, ShoppingBag, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../UI/Card';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutSuccess(true);
      setTimeout(() => {
        setShowLogoutSuccess(false);
        navigate('/');
      }, 2000);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Show logout success popup
  if (showLogoutSuccess) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center z-50">
        <div className="max-w-md w-full mx-4">
          <Card className="p-8 text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Successfully Signed Out!
            </h1>
            <p className="text-gray-600">
              Redirecting you to the home page...
            </p>
          </Card>
        </div>
      </div>
    );
  }

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
            <Link
              to="/about"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-gray-700 hover:text-purple-600 font-medium transition-colors"
            >
              Contact
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