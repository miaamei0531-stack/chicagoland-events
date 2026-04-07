import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase.js';
import { api } from '../services/api.js';
import { formatDate } from '../utils/formatDate.js';
import { CATEGORY_COLORS } from '../utils/categoryColors.js';
import EventDetailPanel from '../components/Events/EventDetailPanel.jsx';
import Navbar from '../components/Layout/Navbar.jsx';

const TABS = [
  { id: 'saved', label: 'Saved' },
  { id: 'commented', label: 'Commented' },
];

function EventRow({ event, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(event.id)}
      className={`w-full text-left p-4 rounded-2xl border transition-all group space-y-1.5 ${
        selected
          ? 'border-[var(--accent)] theme-surface2 ring-1 ring-[var(--accent)]'
          : 'theme-border-s theme-surface hover:theme-surface2'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm theme-text group-hover:text-[var(--accent)] transition-colors leading-snug">
          {event.title}
        </span>
        {event.is_free && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">Free</span>
        )}
      </div>
      <div className="text-xs theme-muted">{formatDate(event.start_datetime)}</div>
      {event.venue_name && (
        <div className="text-xs theme-faint truncate">{event.venue_name}</div>
      )}
      <div className="flex flex-wrap gap-1">
        {(event.category || []).slice(0, 3).map((cat) => (
          <span key={cat} className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-500'}`}>
            {cat}
          </span>
        ))}
      </div>
    </button>
  );
}

export default function Collections() {
  const [session, setSession] = useState(undefined);
  const [tab, setTab] = useState('saved');
  const [data, setData] = useState({ saved: [], commented: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  useEffect(() => {
    if (!session) return;
    setLoading(true);
    api.getCollections(session.access_token)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session]);

  if (session === undefined) {
    return <div className="min-h-screen theme-bg flex items-center justify-center theme-faint">Loading…</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-semibold theme-text">Sign in to view your collections</h1>
          <p className="theme-muted mt-1 text-sm">Use the sign-in button in the top-right corner.</p>
        </div>
      </div>
    );
  }

  const events = tab === 'saved' ? data.saved : data.commented;

  return (
    <div className="min-h-screen theme-bg flex flex-col pb-14 md:pb-0">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Event list */}
        <div className={`flex flex-col flex-1 overflow-hidden transition-all ${selectedId ? 'hidden md:flex md:w-96 md:flex-none' : 'flex'}`}>
          <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-5 shrink-0">
              <h1 className="text-xl font-bold theme-text">My Collections</h1>
              <Link to="/" className="text-xs theme-muted hover:theme-text px-3 py-1.5 rounded-full border theme-border-s theme-surface2">
                ← Map
              </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b theme-border-s mb-5 shrink-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-colors ${
                    tab === t.id
                      ? 'theme-surface border border-b-0 theme-border-s text-[var(--accent)] -mb-px'
                      : 'theme-muted hover:theme-text'
                  }`}
                >
                  {t.label}
                  {!loading && (
                    <span className="ml-1.5 text-xs theme-faint">
                      ({t.id === 'saved' ? data.saved.length : data.commented.length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-2xl border theme-border-s theme-surface animate-pulse space-y-2">
                      <div className="h-4 rounded-full theme-surface2 w-2/3" />
                      <div className="h-3 rounded-full theme-surface2 w-1/3" />
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="text-red-500 text-sm text-center py-8">{error}</div>
              ) : events.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-5xl mb-3">{tab === 'saved' ? '🔖' : '💬'}</div>
                  <p className="theme-muted font-medium">
                    {tab === 'saved' ? 'No saved events yet.' : "You haven't commented on any events yet."}
                  </p>
                  <p className="theme-faint text-sm mt-1">
                    {tab === 'saved'
                      ? 'Click the bookmark icon on any event to save it here.'
                      : 'Join the conversation on events you\'re interested in.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      selected={selectedId === event.id}
                      onSelect={setSelectedId}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Event detail panel */}
        {selectedId && (
          <div className="flex-1 relative flex flex-col overflow-hidden">
            <EventDetailPanel
              eventId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
