import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api.js';
import { supabase } from '../../services/supabase.js';
import SourceBadge from './SourceBadge.jsx';
import CommentThread from '../Community/CommentThread.jsx';
import NewConversationModal from '../Messaging/NewConversationModal.jsx';
import { formatDateTime } from '../../utils/formatDate.js';
import { CATEGORY_COLORS } from '../../utils/categoryColors.js';
import { useTripStore } from '../../store/trip.js';

export default function EventDetailPanel({ eventId, onClose }) {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [savingToken, setSavingToken] = useState(null);
  const [groups, setGroups] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [addingToTrip, setAddingToTrip] = useState(false);

  const { tripMode, tripId, isInTrip, addEvent, removeEvent } = useTripStore();

  useEffect(() => {
    setLoading(true);
    api.getEvent(eventId)
      .then(setEvent)
      .catch(console.error)
      .finally(() => setLoading(false));

    // Check saved state + load public groups if logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setSavingToken(session.access_token);
      api.checkSaved(eventId, session.access_token)
        .then(({ saved }) => setSaved(saved))
        .catch(() => {});
      api.getEventGroups(eventId, session.access_token)
        .then(setGroups)
        .catch(() => {});
    });
  }, [eventId]);

  async function toggleSave() {
    if (!savingToken) return;
    try {
      const { saved: newState } = await api.toggleSave(eventId, savingToken);
      setSaved(newState);
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  async function toggleTrip() {
    if (!savingToken || !tripMode) return;
    setAddingToTrip(true);
    try {
      if (isInTrip(eventId)) {
        await api.removeEventFromTrip(tripId, eventId, savingToken);
        removeEvent(eventId);
      } else {
        let currentTripId = tripId;
        if (!currentTripId) {
          const trip = await api.createTrip({ name: 'My Day Trip', date: new Date().toISOString().slice(0, 10), is_public: false }, savingToken);
          useTripStore.getState().setTripId(trip.id);
          currentTripId = trip.id;
        }
        const result = await api.addEventToTrip(currentTripId, eventId, savingToken);
        addEvent({ ...result, event_id: eventId, event });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingToTrip(false);
    }
  }

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-96 theme-surface theme-shadow-lg z-10 flex flex-col overflow-hidden border-l theme-border-s">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b theme-border-s">
        <span className="text-xs font-semibold theme-muted uppercase tracking-widest">Event Details</span>
        <div className="flex items-center gap-2">
          {tripMode && savingToken && (
            <button
              onClick={toggleTrip}
              disabled={addingToTrip}
              title={isInTrip(eventId) ? 'Remove from trip' : 'Add to trip'}
              className={`h-7 px-2.5 flex items-center gap-1 rounded-full text-xs font-medium transition-all ${
                isInTrip(eventId)
                  ? 'bg-[var(--accent)] text-white'
                  : 'theme-surface2 theme-muted hover:border-[var(--accent)] border theme-border-s'
              }`}
            >
              {isInTrip(eventId) ? '✓ In Trip' : '+ Trip'}
            </button>
          )}
          {savingToken && (
            <button
              onClick={toggleSave}
              title={saved ? 'Remove from collection' : 'Save to collection'}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${
                saved
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                  : 'theme-surface2 theme-faint hover:text-amber-500'
              }`}
            >
              <svg className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          )}
          <button onClick={onClose} className="theme-faint hover:theme-text text-xl leading-none">&times;</button>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center theme-faint text-sm">Loading…</div>
      )}

      {!loading && !event && (
        <div className="flex-1 flex items-center justify-center theme-faint text-sm">Event not found.</div>
      )}

      {!loading && event && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Source badge */}
          <div>
            <SourceBadge isUserSubmitted={event.is_user_submitted} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold theme-text leading-snug">{event.title}</h2>

          {/* Categories */}
          {event.category?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.category.map((cat) => (
                <span key={cat} className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}>
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Date & time */}
          <div className="text-sm theme-text space-y-0.5">
            <div className="font-medium">{formatDateTime(event.start_datetime)}</div>
            {event.end_datetime && (
              <div className="theme-muted">Until {formatDateTime(event.end_datetime)}</div>
            )}
            {event.is_recurring && (
              <div className="text-community font-medium text-xs">Recurring event</div>
            )}
          </div>

          {/* Location */}
          {(event.venue_name || event.address) && (
            <div className="text-sm">
              {event.venue_name && <div className="font-medium theme-text">{event.venue_name}</div>}
              {event.address && <div className="theme-muted">{event.address}</div>}
              {event.neighborhood && <div className="theme-faint text-xs">{event.neighborhood}{event.city ? `, ${event.city}` : ''}</div>}
            </div>
          )}

          {/* Cost */}
          <div className="text-sm">
            {event.is_free ? (
              <span className="text-green-600 font-semibold">Free</span>
            ) : (
              <span className="text-gray-700">
                {event.price_min != null && event.price_max != null && event.price_min !== event.price_max
                  ? `$${event.price_min} – $${event.price_max}`
                  : event.price_min != null
                  ? `$${event.price_min}`
                  : 'Paid'}
              </span>
            )}
            {event.price_notes && (
              <div className="text-gray-400 text-xs mt-0.5">{event.price_notes}</div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm theme-muted leading-relaxed">{event.description}</p>
          )}

          {/* Links */}
          <div className="space-y-2 pt-2">
            {event.official_url && (
              <a
                href={event.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-official text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Official Page
              </a>
            )}
            {event.ticket_url && (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center border border-official text-official text-sm font-medium py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Get Tickets
              </a>
            )}
          </div>

          {/* Public Groups */}
          {savingToken && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold theme-muted uppercase tracking-widest">Groups</span>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  + Create group
                </button>
              </div>
              {groups.length === 0 ? (
                <p className="text-xs theme-faint">No public groups yet. Be the first!</p>
              ) : (
                <div className="space-y-1.5">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => navigate(`/messages/${g.id}`)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border theme-border-s theme-surface2 hover:border-[var(--accent)] transition-all text-left"
                    >
                      <div>
                        <p className="text-sm font-medium theme-text">{g.name}</p>
                        <p className="text-xs theme-faint">by {g.creator?.display_name} · {g.member_count?.[0]?.count ?? 0} members</p>
                      </div>
                      <span className="text-xs text-[var(--accent)]">Join →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments */}
          <CommentThread eventId={eventId} />
        </div>
      )}
      {showCreateGroup && savingToken && (
        <NewConversationModal
          token={savingToken}
          onClose={() => setShowCreateGroup(false)}
          forEventId={eventId}
          forEventTitle={event?.title}
        />
      )}
    </div>
  );
}
