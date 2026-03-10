import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Card } from '../components/UI/Card';
import { FadeInUp } from '../components/Motion';
import { useAuth } from '../hooks/useAuth';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setConfirmPasswordError('');
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50";

  return (
    <div className="pt-16 min-h-screen bg-brand-dark flex items-center justify-center">
      <FadeInUp className="max-w-md w-full mx-4">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Create Account
            </h1>
            <p className="text-white/50">
              Join ShapeMint and start creating amazing 3D designs
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClasses}
                required
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {password && password.length > 0 && password.length < 6 && (
              <div className="mt-2 text-sm text-red-400">Password must be at least 6 characters long.</div>
            )}
            {passwordError && (
              <div className="mt-2 text-sm text-red-400">{passwordError}</div>
            )}

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClasses}
                required
              />
            </div>
            {confirmPassword && confirmPassword.length > 0 && confirmPassword !== password && (
              <div className="mt-2 text-sm text-red-400">Passwords do not match.</div>
            )}
            {confirmPasswordError && (
              <div className="mt-2 text-sm text-red-400">{confirmPasswordError}</div>
            )}

            <div className="flex items-center">
              <input type="checkbox" className="h-4 w-4 text-brand-accent focus:ring-brand-accent border-white/20 rounded bg-white/5" required />
              <span className="ml-2 text-sm text-white/50">
                I agree to the{' '}
                <a href="#" className="text-brand-accent hover:text-brand-accent-light">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-brand-accent hover:text-brand-accent-light">Privacy Policy</a>
              </span>
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-white/50">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-accent hover:text-brand-accent-light font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </FadeInUp>
    </div>
  );
}
