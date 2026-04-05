import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '../../store/trip.js';
import { api } from '../../services/api.js';
import { supabase } from '../../services/supabase.js';
import { formatDateTime } from '../../utils/formatDate.js';
import ShareTripModal from './ShareTripModal.jsx';

export default function TripPanel({ onSelectEvent }) {
  const navigate = useNavigate();
  const {
    tripDate, setTripDate,
    tripName, setTripName,
    tripEvents, reorder, removeEvent,
    tripId, setTripId,
    routeMode, setRouteMode,
    reset,
  } = useTripStore();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(tripName);
  const [token, setToken] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const dragFrom = useRef(null);

  // Grab token once
  useState(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setToken(session.access_token);
    });
  });

  async function saveTrip() {
    if (!token) return;
    setSaving(true);
    try {
      if (!tripId) {
        const trip = await api.createTrip(
          { name: tripName, date: tripDate || new Date().toISOString().slice(0, 10), is_public: false },
          token
        );
        setTripId(trip.id);
        // re-add all events to the newly saved trip
        for (const te of tripEvents) {
          await api.addEventToTrip(trip.id, te.event_id, token);
        }
      } else {
        await api.updateTrip(tripId, { name: tripName }, token);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(e, idx) {
    dragFrom.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    if (dragFrom.current === null || dragFrom.current === idx) return;
    reorder(dragFrom.current, idx);
    dragFrom.current = idx;
  }

  function handleDragEnd() {
    dragFrom.current = null;
  }

  async function handleRemove(eventId) {
    removeEvent(eventId);
    if (tripId && token) {
      try { await api.removeEventFromTrip(tripId, eventId, token); } catch {}
    }
  }

  function commitName() {
    setEditingName(false);
    setTripName(nameVal);
  }

  return (
    <div className="w-80 flex flex-col theme-surface border-l theme-border-s overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b theme-border-s flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🗺️</span>
          {editingName ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => e.key === 'Enter' && commitName()}
              className="text-sm font-semibold theme-text bg-transparent border-b border-[var(--accent)] outline-none min-w-0 flex-1"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-semibold theme-text truncate hover:text-[var(--accent)] transition-colors text-left"
              title="Rename trip"
            >
              {tripName}
            </button>
          )}
        </div>
        <button onClick={reset} className="text-xs theme-faint hover:theme-text shrink-0">✕ Exit</button>
      </div>

      {/* Date picker */}
      <div className="px-4 py-2 border-b theme-border-s">
        <label className="text-xs theme-muted block mb-1">Trip Date</label>
        <input
          type="date"
          value={tripDate || ''}
          onChange={(e) => setTripDate(e.target.value || null)}
          className="w-full text-sm theme-text theme-surface2 border theme-border-s rounded-lg px-2 py-1 outline-none focus:border-[var(--accent)]"
        />
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {tripEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 theme-faint text-sm text-center px-6">
            <span className="text-2xl">📍</span>
            Click <strong>+ Trip</strong> on any event to add it here
          </div>
        ) : (
          <ul className="p-2 space-y-1.5">
            {tripEvents.map((te, idx) => (
              <li
                key={te.event_id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className="flex items-start gap-2 p-2.5 rounded-xl border theme-border-s theme-surface2 cursor-grab active:cursor-grabbing group"
              >
                <span className="text-xs font-bold text-[var(--accent)] w-4 shrink-0 mt-0.5">{idx + 1}</span>
                <button
                  className="flex-1 text-left min-w-0"
                  onClick={() => onSelectEvent(te.event_id)}
                >
                  <p className="text-sm font-medium theme-text leading-snug truncate">{te.event?.title || 'Event'}</p>
                  {te.event?.start_datetime && (
                    <p className="text-xs theme-faint mt-0.5">{formatDateTime(te.event.start_datetime)}</p>
                  )}
                  {te.event?.venue_name && (
                    <p className="text-xs theme-faint truncate">{te.event.venue_name}</p>
                  )}
                </button>
                <button
                  onClick={() => handleRemove(te.event_id)}
                  className="opacity-0 group-hover:opacity-100 theme-faint hover:text-red-500 transition-all text-sm shrink-0 mt-0.5"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t theme-border-s space-y-2">
        {/* Route mode toggle */}
        <div className="flex rounded-lg overflow-hidden border theme-border-s text-xs font-medium">
          {['driving', 'walking'].map((mode) => (
            <button
              key={mode}
              onClick={() => setRouteMode(mode)}
              className={`flex-1 py-1.5 capitalize transition-colors ${
                routeMode === mode
                  ? 'bg-[var(--accent)] text-white'
                  : 'theme-surface2 theme-muted hover:theme-text'
              }`}
            >
              {mode === 'driving' ? '🚗 Driving' : '🚶 Walking'}
            </button>
          ))}
        </div>

        {/* Save + Share */}
        <div className="flex gap-2">
          <button
            onClick={saveTrip}
            disabled={saving || tripEvents.length === 0}
            className="flex-1 text-xs font-medium py-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Trip'}
          </button>
          {tripId && (
            <>
              <button
                onClick={() => navigate(`/trip/${tripId}`)}
                className="text-xs font-medium py-2 px-2.5 rounded-lg border theme-border-s theme-surface2 theme-muted hover:theme-text transition-colors"
                title="View public page"
              >
                View
              </button>
              <button
                onClick={() => setShowShare(true)}
                className="text-xs font-medium py-2 px-2.5 rounded-lg border theme-border-s theme-surface2 theme-muted hover:text-[var(--accent)] transition-colors"
                title="Share trip"
              >
                Share
              </button>
            </>
          )}
        </div>
      </div>

      {showShare && tripId && token && (
        <ShareTripModal
          tripId={tripId}
          token={token}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
