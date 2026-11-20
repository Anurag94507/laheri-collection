import { create } from 'zustand';

// A tiny event store so the floating bag can pop whenever a garment lands in it.
export const useBagFx = create((set) => ({
  pulse: 0,
  bump: () => set((state) => ({ pulse: state.pulse + 1 })),
}));
