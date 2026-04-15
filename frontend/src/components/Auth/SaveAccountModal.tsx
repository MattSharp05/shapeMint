import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, X } from 'lucide-react';
import { Button } from '../UI/Button';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';

interface SaveAccountModalProps {
  /** Optional heading copy, e.g. "Save your work" vs "Create an account to continue". */
  heading?: string;
  subheading?: string;
  /** Called on successful save (either conversion, or sign-in + merge). */
  onSuccess: () => void;
  /** Close without saving. */
  onDismiss?: () => void;
  /** When true, hide the dismiss button (use for hard gates like rate-limit). */
  required?: boolean;
}

type Mode = 'new' | 'existing' | 'merge_prompt';

export function SaveAccountModal({
  heading = 'Save your work',
  subheading = 'Create a free account to keep your designs and continue from any device.',
  onSuccess,
  onDismiss,
  required = false,
}: SaveAccountModalProps) {
  const { user, convertAnonToUser, login } = useAuth();
  const [mode, setMode] = useState<Mode>('new');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingAnonId, setPendingAnonId] = useState<string | null>(null);

  const reset = () => {
    setError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    if (!email || !password) return setError('Email and password required.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirmPassword) return setError("Passwords don't match.");

    setLoading(true);
    try {
      await convertAnonToUser(email, password);
      onSuccess();
    } catch (err: any) {
      const msg = err?.message || '';
      logger.error('convertAnonToUser failed:', msg);
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('already been registered') ||
        msg.toLowerCase().includes('user already exists') ||
        msg.toLowerCase().includes('email address already')
      ) {
        // Capture the anon id now, before we sign out — otherwise we lose it.
        setPendingAnonId(user?.id || null);
        setMode('merge_prompt');
      } else {
        setError(msg || 'Could not save. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();
    if (!email || !password) return setError('Email and password required.');

    setLoading(true);
    try {
      const authUser = await login(email, password);
      if (!authUser) throw new Error('Sign in failed.');
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleMergeAndSignIn = async () => {
    reset();
    setLoading(true);
    const oldAnonUserId = pendingAnonId;
    try {
      if (!oldAnonUserId) throw new Error('Missing anonymous session.');

      // Sign out the anon session so we can sign in as the real user.
      await supabase.auth.signOut();
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr || !data.user) throw signInErr || new Error('Sign in failed.');

      // Now call the merge edge function as the real user.
      const { error: mergeErr } = await supabase.functions.invoke('merge-anon-user', {
        body: { oldAnonUserId },
      });
      if (mergeErr) {
        logger.error('merge-anon-user error:', mergeErr);
        // Non-fatal: the user is signed in successfully; their anon work
        // may not have been reassigned. Continue.
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Could not merge accounts. Please sign in separately.');
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardAndSignIn = async () => {
    reset();
    setLoading(true);
    try {
      await supabase.auth.signOut();
      const authUser = await login(email, password);
      if (!authUser) throw new Error('Sign in failed.');
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    'w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-brand-dark-lighter border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-8">
        {!required && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 p-1 rounded-full text-white/50 hover:text-white hover:bg-white/5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <h2 className="text-xl font-bold text-white mb-1">{heading}</h2>
        <p className="text-sm text-white/50 mb-6">{subheading}</p>

        {mode !== 'merge_prompt' && (
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => { setMode('new'); reset(); setConfirmPassword(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'new'
                  ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30'
                  : 'text-white/40 border border-white/10 hover:text-white/60'
              }`}
            >
              New Account
            </button>
            <button
              type="button"
              onClick={() => { setMode('existing'); reset(); setConfirmPassword(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'existing'
                  ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30'
                  : 'text-white/40 border border-white/10 hover:text-white/60'
              }`}
            >
              Sign In
            </button>
          </div>
        )}

        {mode === 'merge_prompt' ? (
          <div className="space-y-4">
            <div className="p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg text-sm text-amber-200">
              An account with this email already exists. Sign in to continue — we'll bring your in-progress work with you.
            </div>
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
            )}
            <Button className="w-full" size="lg" loading={loading} onClick={handleMergeAndSignIn}>
              Sign in and keep my work
            </Button>
            <button
              type="button"
              disabled={loading}
              onClick={handleDiscardAndSignIn}
              className="w-full py-2 text-sm text-white/50 hover:text-white/80 transition-colors disabled:opacity-50"
            >
              Sign in without merging
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => { setMode('new'); reset(); }}
              className="w-full py-2 text-sm text-white/40 hover:text-white/60 transition-colors disabled:opacity-50"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={mode === 'new' ? handleCreate : handleSignIn} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses}
                required
                autoFocus
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'new' ? 'Create password (min 6 characters)' : 'Password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {mode === 'new' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50"
                  required
                />
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="mt-1.5 text-xs text-red-400">Passwords don't match.</p>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500/20 rounded-lg text-sm text-red-400">{error}</div>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {mode === 'new' ? 'Save my work' : 'Sign in'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
