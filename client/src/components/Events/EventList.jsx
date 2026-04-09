import { useEffect, useRef } from 'react';
import { useEvents } from '../../hooks/useEvents.js';
import EventCard from './EventCard.jsx';
import WeatherWidget from '../Weather/WeatherWidget.jsx';

function CardSkeleton() {
  return (
    <div className="p-3 rounded-2xl border theme-border-s space-y-2 animate-pulse">
      <div className="h-4 rounded-full theme-surface2 w-3/4" />
      <div className="h-3 rounded-full theme-surface2 w-1/3" />
      <div className="h-3 rounded-full theme-surface2 w-1/2" />
      <div className="flex gap-1">
        <div className="h-5 w-14 rounded-full theme-surface2" />
        <div className="h-5 w-10 rounded-full theme-surface2" />
      </div>
    </div>
  );
}

export default function EventList({ onSelectEvent, onClose, selectedEventId }) {
  const { events, loading, error } = useEvents();
  const selectedRef = useRef(null);

  useEffect(() => {
    if (selectedEventId && selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedEventId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden theme-surface border-l theme-border-s">
      <div className="flex items-center justify-between px-4 py-2.5 border-b theme-border-s shrink-0">
        <span className="text-xs font-semibold theme-muted uppercase tracking-widest">
          {loading ? 'Loading…' : `${events.length} event${events.length !== 1 ? 's' : ''}`}
        </span>
        <button
          onClick={onClose}
          className="md:hidden theme-faint hover:theme-text text-lg leading-none"
        >
          ×
        </button>
      </div>

      <WeatherWidget />

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        )}
        {!loading && error && (
          <div className="text-center py-8 px-4">
            <p className="text-sm theme-muted mb-1">Couldn't load events right now.</p>
            <p className="text-xs theme-faint">Check your connection and try refreshing.</p>
          </div>
        )}
        {!loading && !error && events.length === 0 && (
          <div className="text-center py-8 px-4">
            <p className="text-sm theme-muted mb-1">Nothing matches those filters right now.</p>
            <p className="text-xs theme-faint">Try a wider radius, different dates, or clear a category.</p>
          </div>
        )}
        {!loading && events.map((event) => (
          <div
            key={event.id}
            ref={selectedEventId === event.id ? selectedRef : null}
            className={`rounded-2xl transition-all ${selectedEventId === event.id ? 'ring-2 ring-[var(--accent)]' : ''}`}
          >
            <EventCard
              event={event}
              onClick={(id) => { onSelectEvent(id); onClose?.(); }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
