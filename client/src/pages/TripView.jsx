import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatDateTime } from '../utils/formatDate.js';
import { useThemeStore } from '../store/theme.js';

export default function TripView() {
  const { id } = useParams();
  const dark = useThemeStore((s) => s.dark);
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    api.getTrip(id)
      .then(setTrip)
      .catch(() => setError('Trip not found or is private.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center theme-faint text-sm">
        Loading trip…
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen theme-bg flex flex-col items-center justify-center gap-3">
        <p className="theme-muted text-sm">{error || 'Trip not found.'}</p>
        <Link to="/" className="text-xs text-[var(--accent)] hover:underline">← Back to map</Link>
      </div>
    );
  }

  const events = trip.trip_events || [];

  return (
    <div className="min-h-screen theme-bg">
      {/* Header */}
      <header className="theme-surface border-b theme-border-s px-5 py-4 flex items-center justify-between">
        <div>
          <Link to="/" className="text-xs theme-muted hover:theme-text">🗺️ Chicagoland Events</Link>
          <h1 className="text-xl font-bold theme-text mt-0.5">{trip.name}</h1>
          {trip.date && (
            <p className="text-sm theme-muted">
              {new Date(trip.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <span className="text-xs theme-faint">
          By {trip.user?.display_name || 'Anonymous'}
        </span>
      </header>

      {/* Events */}
      <main className="max-w-xl mx-auto px-4 py-6 space-y-3">
        {events.length === 0 ? (
          <p className="theme-faint text-sm text-center py-12">No events in this trip.</p>
        ) : (
          events.map((te, idx) => (
            <div key={te.id} className="flex gap-3 p-4 rounded-xl border theme-border-s theme-surface">
              <span className="text-lg font-bold text-[var(--accent)] w-7 shrink-0">{idx + 1}</span>
              <div className="min-w-0">
                <p className="font-semibold theme-text leading-snug">{te.event?.title}</p>
                {te.event?.start_datetime && (
                  <p className="text-sm theme-muted mt-0.5">{formatDateTime(te.event.start_datetime)}</p>
                )}
                {te.event?.venue_name && (
                  <p className="text-sm theme-faint">{te.event.venue_name}</p>
                )}
                {te.event?.address && (
                  <p className="text-xs theme-faint">{te.event.address}</p>
                )}
                {te.note && (
                  <p className="text-xs theme-muted italic mt-1">{te.note}</p>
                )}
                {te.event?.official_url && (
                  <a
                    href={te.event.official_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--accent)] hover:underline mt-1 inline-block"
                  >
                    Official Page →
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
