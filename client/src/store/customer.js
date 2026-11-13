import { create } from 'zustand';
import { customerLogout, customerMe, getMyBag, saveMyBag } from '../api/index.js';
import { useCart } from './cart.js';

/**
 * Pull the bag saved on the account into the local cart. When the customer
 * already has items locally we merge them (local wins on quantity) and push
 * the combined bag back to the server.
 */
export async function loadBagIntoCart() {
  try {
    const bag = await getMyBag();
    const local = useCart.getState().items || [];
    const remote = Array.isArray(bag.items) ? bag.items : [];

    if (remote.length && !local.length) {
      useCart.setState({ items: remote });
      return;
    }

    if (local.length) {
      const merged = [...local];
      for (const item of remote) {
        if (!merged.some((entry) => entry.key === item.key)) merged.push(item);
      }
      if (merged.length !== local.length) useCart.setState({ items: merged });
      await saveMyBag({ items: merged, couponCode: bag.couponCode || '' });
    }
  } catch {
    // Bag sync is best-effort; the local cart still works.
  }
}

export const useCustomer = create((set, get) => ({
  account: null,
  checked: false,
  loading: false,

  check: async () => {
    try {
      const account = await customerMe();
      set({ account, checked: true });
      return account;
    } catch {
      set({ account: null, checked: true });
      return null;
    }
  },

  setAccount: (account) => set({ account, checked: true }),

  logout: async () => {
    await customerLogout().catch(() => {});
    set({ account: null, checked: true });
  },

  /** Persist the current local bag to this customer's account. */
  syncBag: async () => {
    if (!get().account) return;
    try {
      await saveMyBag({
        items: useCart.getState().items,
        couponCode: useCart.getState().coupon?.code || '',
      });
    } catch {
      // ignore sync errors
    }
  },
}));
