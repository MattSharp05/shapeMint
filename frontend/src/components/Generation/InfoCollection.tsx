import { useState, useRef } from 'react';
import { Mail, Lock, User, Phone, MapPin, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../UI/Button';
import { Card } from '../UI/Card';
import { FadeIn, FadeInUp } from '../Motion';
import { supabase } from '../../supabaseClient';
import { userService } from '../../services/user';
import { useAuth } from '../../hooks/useAuth';

export interface CollectedInfo {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  userId: string;
  smsOptIn: boolean;
}

interface InfoCollectionProps {
  selectedImage: string;
  prompt: string;
  onSubmit: (info: CollectedInfo) => void;
  loading?: boolean;
  angleImages?: string[] | null;
  angleLabels?: string[];
}

export function InfoCollection({ selectedImage, prompt, onSubmit, loading, angleImages, angleLabels }: InfoCollectionProps) {
  const { user, login, register } = useAuth();
  const [isSignIn, setIsSignIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const submittingRef = useRef(false);

  const [carouselIdx, setCarouselIdx] = useState(0);
  const allImages = angleImages && angleImages.length > 0
    ? [selectedImage, ...angleImages]
    : [selectedImage];
  const allLabels = angleImages && angleLabels
    ? ['Selected', ...angleLabels]
    : ['Selected'];

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postalCode: '',
    smsOptIn: true,
  });

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const inputClasses = "w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50";
  const inputClassesNoIcon = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50";
  const selectClasses = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 [&>option]:bg-brand-dark [&>option]:text-white";
  const labelClasses = "block text-sm font-medium text-white/70 mb-1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (!form.email || !form.password) {
      setError('Email and password are required.');
      return;
    }
    if (!isSignIn && (!form.firstName || !form.lastName)) {
      setError('First and last name are required.');
      return;
    }
    if (!isSignIn && (!form.address1 || !form.city || !form.state || !form.postalCode || !form.phone)) {
      setError('Please fill in all shipping fields.');
      return;
    }
    if (!isSignIn && form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setAuthLoading(true);
    submittingRef.current = true;

    try {
      let userId: string;
      let userEmail = form.email;

      if (isSignIn) {
        // Sign in existing user
        const authUser = await login(form.email, form.password);
        if (!authUser) throw new Error('Sign in failed.');
        userId = authUser.id;
        userEmail = authUser.email || form.email;
      } else {
        // Register new user
        const authUser = await register(form.email, form.password, `${form.firstName} ${form.lastName}`);
        if (!authUser) throw new Error('Registration failed.');
        userId = authUser.id;
      }

      onSubmit({
        email: userEmail,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        address1: form.address1,
        address2: form.address2 || undefined,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        userId,
        smsOptIn: form.smsOptIn,
      });
    } catch (err: any) {
      submittingRef.current = false;
      console.error('Auth error:', err);
      if (err?.message?.includes('User already registered')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (err?.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password.');
      } else {
        setError(err?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // If user is already signed in, skip auth fields and just collect shipping
  // But if we're mid-submit (e.g. just logged in), don't flash the shipping form
  const isAuthenticated = !!user && !submittingRef.current;

  const handleAuthenticatedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.firstName || !form.lastName || !form.address1 || !form.city || !form.state || !form.postalCode || !form.phone) {
      setError('Please fill in all shipping fields.');
      return;
    }
    onSubmit({
      email: user!.email,
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      address1: form.address1,
      address2: form.address2 || undefined,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      userId: user!.id,
      smsOptIn: form.smsOptIn,
    });
  };

  return (
    <div className="pt-16 min-h-screen bg-brand-dark">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col lg:flex-row">
          {/* Left — Image carousel */}
          <FadeIn x={-20} duration={0.7} className="lg:w-[50%] bg-brand-dark-lighter lg:min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 lg:p-8">
            <div className="w-full max-w-[500px]">
              <div className="relative">
                <img
                  src={allImages[carouselIdx]}
                  alt={allLabels[carouselIdx] || 'Design preview'}
                  className="w-full rounded-2xl shadow-2xl"
                />
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCarouselIdx((carouselIdx - 1 + allImages.length) % allImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setCarouselIdx((carouselIdx + 1) % allImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1.5 rounded-full">
                      <span className="text-xs text-white font-medium">{allLabels[carouselIdx]}</span>
                    </div>
                  </>
                )}
              </div>
              {allImages.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {allImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === carouselIdx ? 'bg-brand-accent w-4' : 'bg-white/20'}`}
                    />
                  ))}
                </div>
              )}
              <p className="text-sm text-white/50 mt-4 text-center truncate">{prompt}</p>
            </div>
          </FadeIn>

          {/* Right — Info form */}
          <div className="lg:w-[50%] lg:min-h-[calc(100vh-4rem)] lg:overflow-y-auto border-l border-white/5">
            <div className="p-6 lg:p-10 max-w-md mx-auto">
              <FadeIn delay={0.2} y={12}>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Almost there!
                </h1>
                <p className="text-sm text-white/40 mb-8">
                  Enter your details so we can generate your 3D model and prepare a quote.
                </p>
              </FadeIn>

              <FadeInUp delay={0.3}>
                <form onSubmit={isAuthenticated ? handleAuthenticatedSubmit : handleSubmit} className="space-y-5">
                  {/* Auth section — only show if not logged in */}
                  {!isAuthenticated && (
                    <>
                      {/* Toggle: New Account / Sign In */}
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setIsSignIn(false)}
                          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                            !isSignIn ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30' : 'text-white/40 border border-white/10'
                          }`}
                        >
                          New Account
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsSignIn(true)}
                          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                            isSignIn ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30' : 'text-white/40 border border-white/10'
                          }`}
                        >
                          Sign In
                        </button>
                      </div>

                      {/* Email */}
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                        <input
                          type="email"
                          placeholder="Email address"
                          value={form.email}
                          onChange={(e) => update('email', e.target.value)}
                          className={inputClasses}
                          required
                        />
                      </div>

                      {/* Password */}
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder={isSignIn ? 'Password' : 'Create password (min 6 characters)'}
                          value={form.password}
                          onChange={(e) => update('password', e.target.value)}
                          className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/60"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </>
                  )}

                  {isAuthenticated && (
                    <div className="p-3 bg-green-900/20 border border-green-500/20 rounded-lg text-sm text-green-400">
                      Signed in as {user!.email}
                    </div>
                  )}

                  {/* Shipping fields — hide for sign-in mode (they'll fill it on results page) */}
                  {(!isSignIn || isAuthenticated) && (
                    <>
                      <div className="border-t border-white/5 pt-5 mt-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">Shipping Information</p>
                      </div>

                      {/* Name */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                          <input
                            type="text"
                            placeholder="First name"
                            value={form.firstName}
                            onChange={(e) => update('firstName', e.target.value)}
                            className={inputClasses}
                            required
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Last name"
                          value={form.lastName}
                          onChange={(e) => update('lastName', e.target.value)}
                          className={inputClassesNoIcon}
                          required
                        />
                      </div>

                      {/* Phone */}
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                        <input
                          type="tel"
                          placeholder="Phone number"
                          value={form.phone}
                          onChange={(e) => update('phone', e.target.value)}
                          className={inputClasses}
                          required
                        />
                      </div>

                      {/* Address */}
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/50" />
                        <input
                          type="text"
                          placeholder="Street address"
                          value={form.address1}
                          onChange={(e) => update('address1', e.target.value)}
                          className={inputClasses}
                          required
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Apt, suite, etc. (optional)"
                        value={form.address2}
                        onChange={(e) => update('address2', e.target.value)}
                        className={inputClassesNoIcon}
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="City"
                          value={form.city}
                          onChange={(e) => update('city', e.target.value)}
                          className={inputClassesNoIcon}
                          required
                        />
                        <input
                          type="text"
                          placeholder="State"
                          value={form.state}
                          onChange={(e) => update('state', e.target.value)}
                          className={inputClassesNoIcon}
                          required
                        />
                      </div>

                      <input
                        type="text"
                        placeholder="ZIP code"
                        value={form.postalCode}
                        onChange={(e) => update('postalCode', e.target.value)}
                        className={inputClassesNoIcon}
                        required
                      />

                      {/* SMS opt-in — hidden until phone number is approved
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={form.smsOptIn}
                          onChange={(e) => setForm(prev => ({ ...prev, smsOptIn: e.target.checked }))}
                          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 text-brand-accent focus:ring-brand-accent/50"
                        />
                        <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
                          Text me when my model is ready (standard message rates may apply)
                        </span>
                      </label>
                      */}
                    </>
                  )}

                  {error && (
                    <div className="p-3 bg-red-900/20 border border-red-500/20 rounded-lg">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    loading={authLoading || loading}
                  >
                    {isSignIn ? 'Sign In & Generate' : 'Generate My Model'}
                  </Button>

                  {isSignIn && !isAuthenticated && (
                    <p className="text-xs text-white/50 text-center">
                      You'll enter shipping details on the next page.
                    </p>
                  )}
                </form>
              </FadeInUp>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
