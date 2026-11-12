import { create } from 'zustand';
import { adminLogin, adminLogout, adminMe } from '../api/index.js';

export const useAuth = create((set) => ({
  user: null,
  checked: false,
  loading: false,
  check: async () => {
    try {
      const user = await adminMe();
      set({ user, checked: true });
      return user;
    } catch {
      set({ user: null, checked: true });
      return null;
    }
  },
  login: async (username, password) => {
    set({ loading: true });
    try {
      const data = await adminLogin({ username, password });
      set({ user: data.user, checked: true, loading: false });
      return data.user;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  logout: async () => {
    await adminLogout().catch(() => {});
    set({ user: null, checked: true });
  },
}));
