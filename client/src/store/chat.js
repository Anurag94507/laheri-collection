import { create } from 'zustand';

export const useChat = create((set) => ({
  open: false,
  openChat: () => set({ open: true }),
  closeChat: () => set({ open: false }),
  toggleChat: () => set((state) => ({ open: !state.open })),
}));
