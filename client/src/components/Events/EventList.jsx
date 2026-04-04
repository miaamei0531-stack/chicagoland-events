import { useEvents } from '../../hooks/useEvents.js';
import EventCard from './EventCard.jsx';

function CardSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-gray-100 space-y-2 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-1/3" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
      <div className="flex gap-1">
        <div className="h-4 w-14 bg-gray-100 rounded-full" />
        <div className="h-4 w-10 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

export default function EventList({ onSelectEvent, open, onClose }) {
  const { events, loading, error } = useEvents();

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed md:static top-0 right-0 h-full z-30 md:z-auto
          w-80 bg-white border-l flex flex-col overflow-hidden
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold text-gray-700">
            {loading ? 'Loading…' : `${events.length} event${events.length !== 1 ? 's' : ''}`}
          </span>
          <button
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
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
            <p className="text-sm text-red-500 text-center py-4">Failed to load events.</p>
          )}
          {!loading && !error && events.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No events in this area.</p>
          )}
          {!loading && events.map((event) => (
            <EventCard key={event.id} event={event} onClick={(id) => { onSelectEvent(id); onClose?.(); }} />
          ))}
        </div>
      </div>
    </>
  );
}
