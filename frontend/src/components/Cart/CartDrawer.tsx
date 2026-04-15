import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, ShoppingCart, Minus, Plus } from 'lucide-react';
import { Button } from '../UI/Button';
import { useCart } from '../../hooks/useCart';
import type { CartItemWithModel } from '../../services/cartService';

function cheapestPrice(item: CartItemWithModel): number | null {
  const vendors = item.quote_snapshot?.vendors;
  if (!vendors || vendors.length === 0) return null;
  const sorted = [...vendors].sort((a, b) => a.totalPrice - b.totalPrice);
  return sorted[0].totalPrice;
}

function printTypeLabel(t: string): string {
  if (t === 'color') return 'Full Color';
  if (t === 'mono') return 'Resin';
  if (t === 'sls') return 'SLS Nylon';
  return t;
}

export function CartDrawer() {
  const navigate = useNavigate();
  const { isOpen, close, items, loading, updateQuantity, removeItem } = useCart();

  const currency = items[0]?.quote_snapshot?.currency || 'USD';
  const subtotal = useMemo(() => {
    return items.reduce((sum, i) => {
      const p = cheapestPrice(i);
      return p == null ? sum : sum + p * i.quantity;
    }, 0);
  }, [items]);

  const handleCheckout = () => {
    close();
    navigate('/cart-checkout');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={close}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full max-w-md bg-brand-dark-card border-l border-white/10 z-[70] shadow-2xl transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } flex flex-col`}
        role="dialog"
        aria-label="Cart"
      >
        <header className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-brand-accent" />
            <h2 className="text-lg font-semibold text-white">Your Cart</h2>
            <span className="text-sm text-white/50">({items.length})</span>
          </div>
          <button
            onClick={close}
            className="text-white/40 hover:text-white p-1"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="p-6 text-sm text-white/50">Loading…</p>
          ) : items.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingCart className="h-10 w-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/50">Your cart is empty.</p>
              <p className="text-xs text-white/30 mt-1">Add models from the model page to get started.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {items.map(item => {
                const price = cheapestPrice(item);
                const unavailable = price == null;
                return (
                  <li key={item.id} className="p-4 flex gap-3">
                    <img
                      src={item.model?.thumbnail_url || 'https://placehold.co/80x80?text=3D'}
                      alt={item.model?.name || 'Model'}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-white/5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {item.model?.name || 'Untitled model'}
                          </div>
                          <div className="text-xs text-white/50 mt-0.5">
                            {printTypeLabel(item.print_type)}
                          </div>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-white/30 hover:text-red-400 flex-shrink-0"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 border border-white/10 rounded-md">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            disabled={item.quantity <= 1}
                            className="p-1 text-white/60 hover:text-white disabled:opacity-30"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="text-xs text-white w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 text-white/60 hover:text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {unavailable
                            ? <span className="text-xs text-amber-400">No quote</span>
                            : `$${(price * item.quantity).toFixed(2)}`}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="border-t border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Subtotal</span>
              <span className="text-white font-semibold">
                ${subtotal.toFixed(2)} {currency}
              </span>
            </div>
            <p className="text-[11px] text-white/40">
              Shipping & taxes calculated at checkout.
            </p>
            <Button onClick={handleCheckout} className="w-full">
              Checkout
            </Button>
          </footer>
        )}
      </aside>
    </>
  );
}
