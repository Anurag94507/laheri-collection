import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const keyFor = (productId, size) => `${productId}::${size}`;

export const useCart = create(
  persist(
    (set) => ({
      items: [],
      coupon: null,
      addItem: (product, size, quantity = 1) =>
        set((state) => {
          const chosenSize = size || product.sizes?.[0] || 'Free Size';
          const key = keyFor(product._id, chosenSize);
          const existing = state.items.find((item) => item.key === key);
          const price = Number(product.effectivePrice ?? (product.discountPrice > 0 ? product.discountPrice : product.price));
          const maxStock = Math.max(Number(product.stock) || 10, 1);

          if (existing) {
            return {
              items: state.items.map((item) =>
                item.key === key
                  ? { ...item, quantity: Math.min(item.quantity + quantity, maxStock) }
                  : item
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                key,
                productId: product._id,
                name: product.name,
                price,
                image: product.images?.[0] || '',
                category: product.category,
                size: chosenSize,
                maxStock,
                quantity: Math.min(quantity, maxStock),
              },
            ],
          };
        }),
      setQuantity: (key, quantity) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.key === key
              ? { ...item, quantity: Math.max(1, Math.min(Number(quantity) || 1, item.maxStock || 10)) }
              : item
          ),
        })),
      removeItem: (key) => set((state) => ({ items: state.items.filter((item) => item.key !== key) })),
      setCoupon: (coupon) => set({ coupon }),
      clear: () => set({ items: [], coupon: null }),
    }),
    {
      name: 'raja-cart',
      partialize: (state) => ({ items: state.items, coupon: state.coupon }),
    }
  )
);

export const cartCount = (items) => items.reduce((sum, item) => sum + item.quantity, 0);
