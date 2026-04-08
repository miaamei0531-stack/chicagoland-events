import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatDateTime } from '../utils/formatDate.js';

const BASE = import.meta.env.VITE_API_BASE_URL;

function ItineraryStop({ stop, isLast }) {
  const isSuggestion = stop.type === 'suggestion';
  return (
    <div className="flex gap-3 pb-5">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${isSuggestion ? 'bg-[var(--border)]' : 'bg-[var(--accent)]'}`} />
        {!isLast && <div className="w-px flex-1 bg-[var(--border-subtle)] mt-1" style={{ minHeight: '2.5rem' }} />}
      </div>
      <div className="flex-1">
        <div className={`p-3.5 rounded-xl border ${isSuggestion ? 'theme-surface2 border-[var(--border-subtle)] opacity-80' : 'theme-surface border-[var(--border-subtle)]'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold theme-faint">{stop.time}</span>
            {stop.duration_minutes && <span className="text-xs theme-faint">{stop.duration_minutes} min</span>}
          </div>
          <p className="text-sm font-semibold theme-text">{stop.title}</p>
          {stop.description && <p className="text-xs theme-muted mt-1 leading-relaxed">{stop.description}</p>}
        </div>
        {stop.travel_to_next && (
          <div className="flex items-center gap-2 mt-2 px-2">
            <span className="text-xs theme-faint">
              {stop.travel_to_next.mode === 'walking' ? '🚶' : stop.travel_to_next.mode === 'transit' ? '🚌' : '🚗'}
            </span>
            <span className="text-xs theme-faint">
              {stop.travel_to_next.duration_minutes} min
              {stop.travel_to_next.note ? ` · ${stop.travel_to_next.note}` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlanShare() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/itinerary/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen theme-bg flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg font-semibold theme-text">Plan not found</p>
        <p className="text-sm theme-muted">This link may have expired or been made private.</p>
        <Link to="/" className="text-sm text-[var(--accent)] font-medium">Browse events →</Link>
      </div>
    );
  }

  const stops = Array.isArray(data.itinerary_data) ? data.itinerary_data : data.itinerary_data?.itinerary || [];
  const summary = data.itinerary_data?.summary;
  const dateStr = data.date
    ? new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="min-h-screen theme-bg pb-16">
      {/* Header */}
      <div className="theme-surface border-b theme-border-s px-4 py-4">
        <p className="text-sm font-semibold theme-muted">🗺️ Chicagoland Events</p>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold theme-text">{data.title || 'Day Plan'}</h1>
          {dateStr && <p className="text-sm theme-muted mt-1">{dateStr}</p>}
          {summary && <p className="text-sm theme-muted mt-3 leading-relaxed">{summary}</p>}
        </div>

        {stops.length > 0 ? (
          <div>
            {stops.map((stop, i) => (
              <ItineraryStop key={i} stop={stop} isLast={i === stops.length - 1} />
            ))}
          </div>
        ) : (
          <p className="text-sm theme-faint text-center py-8">No stops in this plan.</p>
        )}

        {/* App banner */}
        <div className="mt-8 p-5 rounded-2xl theme-surface2 border border-[var(--border-subtle)] text-center">
          <p className="text-sm font-semibold theme-text mb-1">Plan your own day</p>
          <p className="text-xs theme-muted mb-3">Discover events + get AI-curated weekend plans at Chicagoland Events</p>
          <Link
            to="/"
            className="inline-block px-5 py-2.5 rounded-xl theme-btn-accent text-sm font-semibold"
          >
            Get Started →
          </Link>
        </div>
      </div>
    </div>
  );
}
