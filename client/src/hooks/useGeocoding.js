// Implemented in M8 — debounced address → lat/lng lookup via /auth/geocode
export function useGeocoding() {
  return { coordinates: null, geocode: async () => {} };
}
