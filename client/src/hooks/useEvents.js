import { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { useFiltersStore } from '../store/filters.js';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { categories, startDate, endDate, searchQuery } = useFiltersStore();

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = {};
    if (categories.length) params.category = categories;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    if (searchQuery) params.q = searchQuery;

    api.getEvents(params)
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [categories, startDate, endDate, searchQuery]);

  return { events, loading, error };
}
