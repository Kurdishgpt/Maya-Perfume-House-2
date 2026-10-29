import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useListProducts, type Product as ApiProduct } from '@workspace/api-client-react';
import { copy, type CartLine, type Language, type StoreProduct, type T } from '@/lib/store';

type StoreValue = {
  language: Language; setLanguage: (l: Language) => void; t: T; rtl: boolean;
  products: StoreProduct[]; loading: boolean; isError: boolean; refetch: () => void;
  wishlist: number[]; toggleWish: (id: number) => void;
  cart: CartLine[]; add: (p: ApiProduct, size: number, qty?: number) => void;
  changeQty: (id: number, size: number, delta: number) => void; removeLine: (id: number, size: number) => void; clearCart: () => void;
  count: number; subtotal: number; bagPulse: number;
};

const StoreContext = createContext<StoreValue | null>(null);
const read = <V,>(key: string, fallback: V): V => { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as V : fallback; } catch { return fallback; } };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => { const v = localStorage.getItem('maya-language'); return v === 'ku' || v === 'ar' ? v : 'en'; });
  const catalog = useListProducts({ query: { staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: true, refetchInterval: 60000 } });
  const [wishlist, setWishlist] = useState<number[]>(() => read('maya-wishlist', []));
  const [cart, setCart] = useState<CartLine[]>(() => read('maya-cart', []));
  const [bagPulse, setBagPulse] = useState(0);
  useEffect(() => {
    localStorage.setItem('maya-language', language);
    document.documentElement.lang = language === 'ku' ? 'ckb' : language;
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
  }, [language]);
  useEffect(() => { localStorage.setItem('maya-wishlist', JSON.stringify(wishlist)); }, [wishlist]);
  useEffect(() => { localStorage.setItem('maya-cart', JSON.stringify(cart)); }, [cart]);
  const products = (catalog.data ?? []) as StoreProduct[];
  // Keep bag lines in sync with live catalog data (price, image, title) when available.
  const liveCart = useMemo(() => cart.map((line) => { const live = products.find((p) => p.id === line.product.id); return live ? { ...line, product: live } : line; }), [cart, products]);
  const value: StoreValue = {
    language, setLanguage, rtl: language !== 'en',
    t: (key) => copy[language][key] || copy.en[key] || key,
    products, loading: catalog.isLoading, isError: catalog.isError, refetch: () => { void catalog.refetch(); },
    wishlist, toggleWish: (id) => setWishlist((old) => old.includes(id) ? old.filter((x) => x !== id) : [...old, id]),
    cart: liveCart,
    add: (product, size, quantity = 1) => { setBagPulse((n) => n + 1); setCart((old) => {
      const item = product as StoreProduct;
      const found = old.find((l) => l.product.id === item.id && l.size === size);
      return found ? old.map((l) => l === found ? { ...l, quantity: l.quantity + quantity } : l) : [...old, { product: item, quantity, size }];
    }); },
    changeQty: (id, size, delta) => setCart((old) => old.map((l) => l.product.id === id && l.size === size ? { ...l, quantity: l.quantity + delta } : l).filter((l) => l.quantity > 0)),
    removeLine: (id, size) => setCart((old) => old.filter((l) => !(l.product.id === id && l.size === size))),
    clearCart: () => setCart([]),
    count: liveCart.reduce((n, l) => n + l.quantity, 0),
    subtotal: liveCart.reduce((n, l) => n + l.product.price * l.quantity, 0),
    bagPulse,
  };
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
