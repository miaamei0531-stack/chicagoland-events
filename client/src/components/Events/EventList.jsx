import { useEvents } from '../../hooks/useEvents.js';
import EventCard from './EventCard.jsx';

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

export default function EventList({ onSelectEvent, onClose }) {
  const { events, loading, error } = useEvents();

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
          <p className="text-sm text-red-400 text-center py-6">Failed to load events.</p>
        )}
        {!loading && !error && events.length === 0 && (
          <p className="text-sm theme-faint text-center py-6">No events in this area.</p>
        )}
        {!loading && events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onClick={(id) => { onSelectEvent(id); onClose?.(); }}
          />
        ))}
      </div>
    </div>
  );
}
