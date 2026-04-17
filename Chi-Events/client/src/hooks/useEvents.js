import { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useFiltersStore } from '../store/filters.js';
import { usePlanStore } from '../store/plan.js';
import { NEIGHBORHOOD_CENTERS } from '../utils/neighborhoods.js';

/**
 * useEvents — fetches events using the SAME endpoint and filter logic as MapView.
 *
 * Previously called api.getEvents() which used a different endpoint (/events)
 * that didn't support radius_lat/radius_lng, causing the event list to show
 * "nothing found" while the map showed matching events.
 *
 * Now calls api.getEventsWithinBounds() with wide default bounds + the
 * neighborhood center as radius anchor — identical to what MapView does.
 */

// Wide bounds covering the full Chicagoland area (fallback when no map viewport available)
const DEFAULT_BOUNDS = {
  north: 42.15,
  south: 41.60,
  east: -87.40,
  west: -88.40,
};

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { categories, startDate, endDate, searchQuery, neighborhood, radius } = useFiltersStore();
  const isPlanOpen = usePlanStore((s) => s.isPlanOpen);
  const planDate = usePlanStore((s) => s.selectedDate);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Start with wide Chicagoland bounds
    const params = { ...DEFAULT_BOUNDS };

    // Apply text/category filters
    if (categories.length) params.category = categories;
    if (searchQuery) params.q = searchQuery;

    // Date: Plan mode locks to plan date, otherwise use filter dates
    if (isPlanOpen && planDate) {
      params.start_date = planDate;
      params.end_date = planDate;
    } else {
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
    }

    // Apply neighborhood + radius — SAME logic as MapView.jsx loadEvents()
    const nbCenter = neighborhood ? NEIGHBORHOOD_CENTERS[neighborhood] : null;
    if (nbCenter || radius) {
      const cLat = nbCenter ? nbCenter.lat : (DEFAULT_BOUNDS.north + DEFAULT_BOUNDS.south) / 2;
      const cLng = nbCenter ? nbCenter.lng : (DEFAULT_BOUNDS.east + DEFAULT_BOUNDS.west) / 2;
      const effectiveRadius = radius || (nbCenter ? 5 : null);
      if (effectiveRadius) {
        params.radius = effectiveRadius;
        params.radius_lat = cLat;
        params.radius_lng = cLng;
        // Expand bounds to cover the radius circle
        const degLat = effectiveRadius / 111;
        const degLng = effectiveRadius / (111 * Math.cos((cLat * Math.PI) / 180));
        params.north = Math.max(params.north, cLat + degLat);
        params.south = Math.min(params.south, cLat - degLat);
        params.east = Math.max(params.east, cLng + degLng);
        params.west = Math.min(params.west, cLng - degLng);
      }
    }

    api.getEventsWithinBounds(params)
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [categories, startDate, endDate, searchQuery, neighborhood, radius, isPlanOpen, planDate]);

  return { events, loading, error };
}
