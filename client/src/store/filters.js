import { create } from 'zustand';

export const useFiltersStore = create((set) => ({
  categories: [],
  startDate: null,
  endDate: null,
  searchQuery: '',

  setCategories: (categories) => set({ categories }),
  toggleCategory: (cat) =>
    set((s) => ({
      categories: s.categories.includes(cat)
        ? s.categories.filter((c) => c !== cat)
        : [...s.categories, cat],
    })),
  setDateRange: (startDate, endDate) => set({ startDate, endDate }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  reset: () => set({ categories: [], startDate: null, endDate: null, searchQuery: '' }),
}));
