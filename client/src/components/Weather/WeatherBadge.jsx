import { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_API_BASE_URL;

/**
 * Shows a weather badge on outdoor events.
 * Only renders if:
 *  - event.is_outdoor === true (explicitly outdoor)
 *  - event.start_datetime is within the next 7 days (forecast available)
 */
export default function WeatherBadge({ event }) {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (!event?.is_outdoor) return;
    if (!event?.start_datetime) return;

    const eventDate = new Date(event.start_datetime);
    const today = new Date();
    const diffDays = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays > 6) return; // outside forecast window

    const dateStr = eventDate.toISOString().split('T')[0];
    const coords = event.coordinates?.coordinates;
    const lat = coords ? coords[1] : undefined;
    const lng = coords ? coords[0] : undefined;

    const params = new URLSearchParams({ date: dateStr });
    if (lat !== undefined) params.set('lat', lat);
    if (lng !== undefined) params.set('lng', lng);

    fetch(`${BASE}/weather?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setWeather(data))
      .catch(() => null);
  }, [event]);

  if (!weather) return null;

  const good = weather.outdoorSuitable;
  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
        good
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-amber-50 text-amber-700 border border-amber-200'
      }`}
    >
      <span>{weather.emoji}</span>
      <span>{good ? `Great day for this — ${weather.tempHighF}°F` : `${weather.summary}`}</span>
    </div>
  );
}
