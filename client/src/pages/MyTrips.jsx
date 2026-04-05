import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { supabase } from '../services/supabase.js';
import { useTripStore } from '../store/trip.js';
import Navbar from '../components/Layout/Navbar.jsx';

export default function MyTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { setTripMode, setTripId, setTripName, setTripDate, setTripEvents } = useTripStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      setToken(session.access_token);
      api.getMyTrips(session.access_token)
        .then(setTrips)
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, []);

  async function loadTrip(trip) {
    // Fetch full trip with events
    const full = await api.getTrip(trip.id, token);
    const events = (full.trip_events || []).sort((a, b) => a.position - b.position);
    setTripMode(true);
    setTripId(full.id);
    setTripName(full.name);
    setTripDate(full.date);
    setTripEvents(events.map((te) => ({ ...te, event_id: te.event?.id || te.event_id })));
    navigate('/');
  }

  async function deleteTrip(id) {
    if (!window.confirm('Delete this trip?')) return;
    setDeleting(id);
    try {
      await api.deleteTrip(id, token);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex flex-col h-screen theme-bg">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold theme-text">My Trips</h1>
            <button
              onClick={() => { useTripStore.getState().reset(); useTripStore.getState().setTripMode(true); navigate('/'); }}
              className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
            >
              + New Trip
            </button>
          </div>

          {loading && (
            <p className="theme-faint text-sm text-center py-12">Loading…</p>
          )}

          {!loading && trips.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <p className="text-3xl">🗺️</p>
              <p className="theme-muted text-sm">No saved trips yet.</p>
              <button
                onClick={() => { useTripStore.getState().reset(); useTripStore.getState().setTripMode(true); navigate('/'); }}
                className="text-xs text-[var(--accent)] hover:underline"
              >
                Plan your first trip →
              </button>
            </div>
          )}

          <div className="space-y-3">
            {trips.map((trip) => {
              const count = trip.trip_events?.[0]?.count ?? 0;
              const dateStr = trip.date
                ? new Date(trip.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                : 'No date set';
              return (
                <div
                  key={trip.id}
                  className="flex items-center gap-3 p-4 rounded-xl border theme-border-s theme-surface hover:border-[var(--accent)] transition-all group"
                >
                  <span className="text-2xl">🗺️</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold theme-text truncate">{trip.name}</p>
                    <p className="text-xs theme-muted">{dateStr} · {count} event{count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link
                      to={`/trip/${trip.id}`}
                      className="text-xs theme-faint hover:theme-text px-2 py-1 rounded-lg border theme-border-s"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View
                    </Link>
                    <button
                      onClick={() => loadTrip(trip)}
                      className="text-xs font-medium px-2 py-1 rounded-lg bg-[var(--accent)] text-white hover:opacity-90"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteTrip(trip.id)}
                      disabled={deleting === trip.id}
                      className="text-xs theme-faint hover:text-red-500 px-2 py-1 rounded-lg border theme-border-s transition-colors"
                    >
                      {deleting === trip.id ? '…' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
