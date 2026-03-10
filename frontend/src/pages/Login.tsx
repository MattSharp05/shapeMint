import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Card } from '../components/UI/Card';
import { FadeIn, FadeInUp } from '../components/Motion';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Clear login error when user starts typing
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (loginError) {
      setLoginError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (loginError) {
      setLoginError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    
    try {
      await login(email, password);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/dashboard');
      }, 2000);
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Parse Supabase error messages to show user-friendly text
      let errorMessage = 'Login failed. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        // } else if (error.message.includes('Email not confirmed')) {
        //   errorMessage = 'Please check your email and confirm your account before signing in.';
        // } else if (error.message.includes('Too many requests')) {
        //   errorMessage = 'Too many login attempts. Please wait a moment before trying again.';
        // } else if (error.message.includes('User not found')) {
        //   errorMessage = 'No account found with this email address. Please check your email or sign up.';
        // } 
        // else {
          // errorMessage = error.message;
        }
      }
      
      setLoginError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    
    try {
      const result = await authService.sendPasswordReset(forgotEmail);
      
      if (result.success) {
        setForgotSuccess(true);
        setTimeout(() => {
          setShowForgotPassword(false);
          setForgotSuccess(false);
          setForgotEmail('');
        }, 3000);
      } else {
        setForgotError(result.error || 'Failed to send reset email');
      }
    } catch (error) {
      setForgotError('An unexpected error occurred. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotError(null);
    setForgotSuccess(false);
  };

  if (showSuccess) {
    return (
      <div className="pt-16 min-h-screen bg-brand-dark flex items-center justify-center">
        <FadeIn>
          <div className="max-w-md w-full mx-4">
            <Card className="p-8 text-center">
              <div className="bg-green-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Successfully Signed In!
              </h1>
              <p className="text-white/50">
                Redirecting you to your dashboard...
              </p>
            </Card>
          </div>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen bg-brand-dark flex items-center justify-center">
      <FadeInUp className="max-w-md w-full mx-4">
        <Card className="p-8">
          {showForgotPassword ? (
            <>
              <div className="mb-6">
                <button
                  onClick={resetForgotPassword}
                  className="flex items-center space-x-2 text-white/50 hover:text-white transition-colors mb-4"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Sign In</span>
                </button>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Reset Password
                </h1>
                <p className="text-white/50">
                  Enter your email to receive a password reset link
                </p>
              </div>

              {forgotSuccess && (
                <div className="mb-6 p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <p className="text-sm text-green-400">
                      Password reset email sent! Check your inbox and follow the link to reset your password.
                    </p>
                  </div>
                </div>
              )}

              {forgotError && (
                <div className="mb-6 p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <p className="text-sm text-red-400">{forgotError}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50"
                    required
                  />
                </div>
                <Button type="submit" loading={forgotLoading} className="w-full" size="lg">
                  {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome Back
                </h1>
                <p className="text-white/50">
                  Sign in to your ShapeMint account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={handleEmailChange}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50"
                    required
                  />
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={handlePasswordChange}
                    className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {loginError && (
                  <div className="p-4 bg-red-900/20 border border-red-500/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <p className="text-sm text-red-400">{loginError}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input type="checkbox" className="h-4 w-4 text-brand-accent focus:ring-brand-accent border-white/20 rounded bg-white/5" />
                    <span className="ml-2 text-sm text-white/50">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-brand-accent hover:text-brand-accent-light"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" loading={loading} className="w-full" size="lg">
                  Sign In
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-white/50">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-brand-accent hover:text-brand-accent-light font-medium">
                    Sign up
                  </Link>
                </p>
              </div>
            </>
          )}
        </Card>
      </FadeInUp>
    </div>
  );
}