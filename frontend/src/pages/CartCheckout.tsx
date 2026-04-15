import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, ShoppingCart } from 'lucide-react';
import { BeamsBackground } from '../components/UI/BeamsBackground';
import { Button } from '../components/UI/Button';
import { AddressPicker } from '../components/Account/AddressPicker';
import { SaveAccountModal } from '../components/Auth/SaveAccountModal';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { cartService } from '../services/cartService';
import { addressService, type AddressInput, type UserAddress } from '../services/addressService';
import { createCartOrder } from '../services/cartOrder';
import { MAX, validateEmail, validatePhoneOptional, validatePostalCode, validateRequired } from '../utils/validation';

function cheapest(vendors: any[] | undefined): any | null {
  if (!vendors || vendors.length === 0) return null;
  return [...vendors].sort((a, b) => a.totalPrice - b.totalPrice)[0];
}

function printTypeLabel(t: string): string {
  if (t === 'color') return 'Full Color';
  if (t === 'mono') return 'Resin';
  if (t === 'sls') return 'SLS Nylon';
  return t;
}

export function CartCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, refresh } = useCart();

  const [picked, setPicked] = useState<AddressInput | null>(null);
  const [pickedSaved, setPickedSaved] = useState<UserAddress | null>(null);
  const [saveToAccount, setSaveToAccount] = useState(true);
  const [email, setEmail] = useState(user?.email || '');
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAccountGate, setShowAccountGate] = useState(false);

  // Anon users must convert before placing an order.
  useEffect(() => {
    if (user?.isAnonymous) setShowAccountGate(true);
  }, [user?.isAnonymous]);

  // Refresh any stale quotes on load so prices + craftcloud_quote_ids are fresh.
  useEffect(() => {
    if (items.length === 0) return;
    if (!items.some(i => cartService.isStale(i.quoted_at))) return;
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      try {
        await cartService.refreshStaleQuotes(items);
        if (!cancelled) await refresh();
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => { cancelled = true; };
  }, [items.length]);

  const { subtotal, currency, anyUnavailable } = useMemo(() => {
    let s = 0;
    let any = false;
    const cur = items[0]?.quote_snapshot?.currency || 'USD';
    for (const i of items) {
      const v = cheapest(i.quote_snapshot?.vendors);
      if (!v) { any = true; continue; }
      s += v.totalPrice * i.quantity;
    }
    return { subtotal: s, currency: cur, anyUnavailable: any };
  }, [items]);

  const validatePicked = (addr: AddressInput): string | null => {
    const checks: (string | null)[] = [
      validateRequired(addr.first_name, 'First name', MAX.NAME),
      validateRequired(addr.last_name, 'Last name', MAX.NAME),
      validateRequired(addr.address1, 'Street address', MAX.ADDRESS),
      validateRequired(addr.city, 'City', MAX.CITY),
      validateRequired(addr.state, 'State'),
      validatePostalCode(addr.postal_code, addr.country || 'US'),
      // Phone is optional — only validated if the user typed something.
      validatePhoneOptional(addr.phone),
    ];
    return checks.find(Boolean) || null;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!user || user.isAnonymous) { setShowAccountGate(true); return; }
    if (items.length === 0) { setError('Your cart is empty.'); return; }
    if (anyUnavailable) { setError('One or more items has no quote available.'); return; }
    if (!picked) { setError('Please enter a shipping address.'); return; }
    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }
    const invalid = validatePicked(picked);
    if (invalid) { setError(invalid); return; }

    setSubmitting(true);
    try {
      // Persist the new address to the account if the user asked us to.
      if (!pickedSaved && saveToAccount) {
        try {
          await addressService.saveFromCheckout(user.id, picked);
        } catch (e) {
          console.warn('Could not save address to account:', e);
        }
      }

      const origin = window.location.origin;
      const resp = await createCartOrder({
        items,
        shippingAddress: {
          firstName: picked.first_name,
          lastName: picked.last_name,
          email,
          address1: picked.address1,
          city: picked.city,
          state: picked.state,
          zipCode: picked.postal_code,
          country: picked.country || 'US',
          phone: picked.phone || '',
        },
        successUrl: `${origin}/order-success`,
        cancelUrl: `${origin}/cart-checkout`,
      });
      window.location.href = resp.stripeCheckoutUrl;
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <BeamsBackground className="pt-16 min-h-screen bg-brand-dark" intensity="subtle">
        <div className="max-w-xl mx-auto p-8 text-center">
          <ShoppingCart className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Your cart is empty</h1>
          <p className="text-sm text-white/50 mb-6">Add models from the model page first.</p>
          <Button onClick={() => navigate('/dashboard')}>Back to my models</Button>
        </div>
      </BeamsBackground>
    );
  }

  return (
    <BeamsBackground className="pt-16 min-h-screen bg-brand-dark" intensity="subtle">
      <div className="max-w-4xl mx-auto p-6 lg:p-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-white/50 hover:text-white mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="text-3xl font-bold text-white mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* Left: address + email */}
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-3">
                Contact
              </h2>
              <input
                type="email"
                placeholder="Email for order confirmation"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={MAX.EMAIL}
                autoComplete="email"
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-brand-accent"
              />
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-3">
                Shipping Address
              </h2>
              <AddressPicker
                onChange={(sel, saved) => { setPicked(sel); setPickedSaved(saved); }}
                onSaveToggle={setSaveToAccount}
                initialSaveToAccount
              />
            </section>
          </div>

          {/* Right: order summary */}
          <aside className="bg-white/5 border border-white/10 rounded-2xl p-5 h-fit lg:sticky lg:top-20">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/50 mb-4">
              Order Summary
            </h2>

            {refreshing && (
              <div className="flex items-center gap-2 text-xs text-white/50 mb-3">
                <Loader2 className="h-3 w-3 animate-spin" /> Refreshing prices…
              </div>
            )}

            <ul className="space-y-3 mb-4 max-h-72 overflow-y-auto">
              {items.map(i => {
                const v = cheapest(i.quote_snapshot?.vendors);
                return (
                  <li key={i.id} className="flex gap-3">
                    <img
                      src={i.model?.thumbnail_url || 'https://placehold.co/48x48?text=3D'}
                      alt={i.model?.name || 'Model'}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white/5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{i.model?.name || 'Untitled'}</div>
                      <div className="text-[11px] text-white/50">
                        {printTypeLabel(i.print_type)} · Qty {i.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-white whitespace-nowrap">
                      {v ? `$${(v.totalPrice * i.quantity).toFixed(2)}` : <span className="text-amber-400 text-xs">No quote</span>}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="border-t border-white/10 pt-3 space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/60">Subtotal</span>
                <span className="text-white font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>Currency</span>
                <span>{currency}</span>
              </div>
            </div>

            {error && <div className="mt-3 text-sm text-red-400">{error}</div>}

            <Button
              onClick={handleSubmit}
              disabled={submitting || refreshing}
              className="w-full mt-4"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Processing…</> : 'Pay with Stripe'}
            </Button>
          </aside>
        </div>
      </div>

      {showAccountGate && (
        <SaveAccountModal
          heading="Sign in to check out"
          subheading="Create a free account or sign in so we can ship your order."
          onSuccess={() => setShowAccountGate(false)}
          onDismiss={() => { setShowAccountGate(false); navigate(-1); }}
          required
        />
      )}
    </BeamsBackground>
  );
}
