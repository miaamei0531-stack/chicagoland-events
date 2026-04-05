export const CATEGORY_COLORS = {
  Food: 'bg-orange-100 text-orange-700',
  Sightseeing: 'bg-sky-100 text-sky-700',
  Festivals: 'bg-pink-100 text-pink-700',
  'Farmers Market': 'bg-green-100 text-green-700',
  Nightlife: 'bg-indigo-100 text-indigo-700',
  Music: 'bg-violet-100 text-violet-700',
  Arts: 'bg-rose-100 text-rose-700',
  'Family-Friendly': 'bg-yellow-100 text-yellow-700',
  Classes: 'bg-teal-100 text-teal-700',
  Workshops: 'bg-cyan-100 text-cyan-700',
};

// Hex colors for Mapbox marker layers
export const CATEGORY_HEX = {
  Food:             '#f97316', // orange
  Sightseeing:      '#0ea5e9', // sky blue
  Festivals:        '#ec4899', // pink
  'Farmers Market': '#22c55e', // green
  Nightlife:        '#6366f1', // indigo
  Music:            '#8b5cf6', // violet
  Arts:             '#f43f5e', // rose
  'Family-Friendly':'#eab308', // yellow
  Classes:          '#14b8a6', // teal
  Workshops:        '#06b6d4', // cyan
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);

export const DEFAULT_HEX = '#94a3b8'; // slate-400 fallback
