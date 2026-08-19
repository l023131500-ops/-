import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  product_id: string;
  product_name: string;
  unit_price_ils: number;
  quantity: number;
  image_url?: string;
  attributes?: Record<string, any>;
}

interface CartStore {
  tenant_id: string | null;
  items: CartItem[];
  setTenant: (id: string) => void;
  addItem: (item: CartItem) => void;
  removeItem: (product_id: string) => void;
  updateQty: (product_id: string, q: number) => void;
  clear: () => void;
  total: () => number;
  count: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      tenant_id: null,
      items: [],
      setTenant: (id) => set((s) => (s.tenant_id !== id ? { tenant_id: id, items: [] } : s)),
      addItem: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.product_id === item.product_id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.product_id === item.product_id ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            };
          }
          return { items: [...s.items, item] };
        }),
      removeItem: (product_id) => set((s) => ({ items: s.items.filter((i) => i.product_id !== product_id) })),
      updateQty: (product_id, q) =>
        set((s) => ({
          items: s.items.map((i) => (i.product_id === product_id ? { ...i, quantity: Math.max(1, q) } : i)),
        })),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.unit_price_ils * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "torah-platform-cart-v1" },
  ),
);
