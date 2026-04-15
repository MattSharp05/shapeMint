import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cartService, type CartItemWithModel, type QuoteSnapshot } from '../services/cartService';
import { useAuth } from './useAuth';
import type { PrintType } from '../constants/craftcloudConfigs';

interface CartContextValue {
  items: CartItemWithModel[];
  count: number; // distinct lines, matches badge
  loading: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  refresh: () => Promise<void>;
  addItem: (params: {
    modelId: string;
    printType: PrintType;
    quantity?: number;
    quote: QuoteSnapshot | null;
    quotedCountry?: string | null;
  }) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItemWithModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    try {
      const rows = await cartService.list(user.id);
      setItems(rows);
    } catch (e) {
      console.error('[cart] refresh failed', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load / reload when auth user changes (including anon→real conversion).
  useEffect(() => { refresh(); }, [refresh]);

  // When the drawer opens, re-quote any stale items silently.
  useEffect(() => {
    if (!isOpen || !user || items.length === 0) return;
    const hasStale = items.some(i => cartService.isStale(i.quoted_at));
    if (!hasStale) return;
    (async () => {
      const refreshed = await cartService.refreshStaleQuotes(items);
      setItems(refreshed);
    })();
  }, [isOpen]);

  const addItem: CartContextValue['addItem'] = useCallback(async (params) => {
    if (!user) throw new Error('Sign in required to add to cart.');
    await cartService.add({ userId: user.id, ...params });
    await refresh();
  }, [user?.id, refresh]);

  const updateQuantity: CartContextValue['updateQuantity'] = useCallback(async (id, quantity) => {
    await cartService.updateQuantity(id, quantity);
    await refresh();
  }, [refresh]);

  const removeItem: CartContextValue['removeItem'] = useCallback(async (id) => {
    await cartService.remove(id);
    await refresh();
  }, [refresh]);

  const clear: CartContextValue['clear'] = useCallback(async () => {
    if (!user) return;
    await cartService.clear(user.id);
    await refresh();
  }, [user?.id, refresh]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.length,
    loading,
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(v => !v),
    refresh,
    addItem,
    updateQuantity,
    removeItem,
    clear,
  }), [items, loading, isOpen, refresh, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
