import { create } from 'zustand';

let counter = 0;

export const useToast = create((set, get) => ({
  toasts: [],
  show: (message, type = 'success') => {
    counter += 1;
    const id = counter;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => get().dismiss(id), 3800);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export const toast = {
  success: (message) => useToast.getState().show(message, 'success'),
  error: (message) => useToast.getState().show(message, 'error'),
  info: (message) => useToast.getState().show(message, 'info'),
};
