import { formatDateTime } from '../../utils/formatDate.js';

export default function MyDayList({ events, onRemove, onReorder, onBuildItinerary, building }) {
  if (events.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-[var(--border)] theme-surface2 text-center">
        <p className="text-xs theme-faint">Tap "+" on events above to add them to your day</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {events.map((event, idx) => (
        <div
          key={event.id}
          className="flex items-center gap-2 px-3 py-2 rounded-lg theme-surface border border-[var(--border-subtle)]"
        >
          <span className="text-xs font-bold theme-faint w-5 shrink-0">{idx + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium theme-text truncate">{event.title}</p>
            <p className="text-[10px] theme-faint">{formatDateTime(event.start_datetime)}</p>
          </div>
          <button
            onClick={() => onRemove(event.id)}
            className="text-xs theme-faint hover:text-red-500 transition-colors shrink-0 px-1"
          >
            ✕
          </button>
        </div>
      ))}

      {events.length >= 2 && (
        <button
          onClick={onBuildItinerary}
          disabled={building}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: 'var(--primary, #E8601C)', color: '#fff' }}
        >
          {building ? 'Building…' : 'Build My Itinerary →'}
        </button>
      )}
      {events.length === 1 && (
        <p className="text-[10px] theme-faint text-center">Add at least 2 events to generate an itinerary with travel between stops</p>
      )}
    </div>
  );
}
