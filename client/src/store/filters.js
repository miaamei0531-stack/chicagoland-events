import { create } from 'zustand';

export const useFiltersStore = create((set) => ({
  categories: [],
  startDate: null,
  endDate: null,
  searchQuery: '',
  neighborhood: '',
  radius: null, // km, null = no radius filter

  setCategories: (categories) => set({ categories }),
  toggleCategory: (cat) =>
    set((s) => ({
      categories: s.categories.includes(cat)
        ? s.categories.filter((c) => c !== cat)
        : [...s.categories, cat],
    })),
  setDateRange: (startDate, endDate) => set({ startDate, endDate }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setNeighborhood: (neighborhood) => set({ neighborhood }),
  setRadius: (radius) => set({ radius }),
  reset: () => set({ categories: [], startDate: null, endDate: null, searchQuery: '', neighborhood: '', radius: null }),
}));
