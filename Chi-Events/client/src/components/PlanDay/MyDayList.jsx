import { formatDateTime } from '../../utils/formatDate.js';

export default function MyDayList({ events, onRemove, onReorder, onBuildItinerary, building }) {
  if (events.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-[var(--border)] theme-surface2 text-center">
        <p className="text-xs theme-faint">Tap "+" on events above to add them to your day</p>
      </div>
    );
  }

  function moveUp(idx) {
    if (idx === 0 || !onReorder) return;
    const reordered = [...events];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    onReorder(reordered);
  }

  function moveDown(idx) {
    if (idx === events.length - 1 || !onReorder) return;
    const reordered = [...events];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    onReorder(reordered);
  }

  return (
    <div className="space-y-1">
      {events.map((event, idx) => (
        <div
          key={event.id}
          className="flex items-center gap-1.5 px-2 py-2 rounded-lg theme-surface border border-[var(--border-subtle)]"
        >
          {/* Number */}
          <span className={`text-xs font-bold w-5 shrink-0 text-center ${
            event.is_place ? 'text-purple-600' : 'text-[#E8601C]'
          }`}>{idx + 1}</span>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium theme-text truncate">{event.title}</p>
            <p className="text-[10px] theme-faint">
              {event.is_place ? (event.venue_name || 'Place') : formatDateTime(event.start_datetime)}
            </p>
          </div>

          {/* Reorder buttons */}
          {events.length > 1 && (
            <div className="flex flex-col shrink-0">
              <button
                type="button"
                onClick={() => moveUp(idx)}
                disabled={idx === 0}
                className="w-6 h-5 flex items-center justify-center rounded text-[10px] theme-faint hover:theme-text hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 transition-colors"
              >▲</button>
              <button
                type="button"
                onClick={() => moveDown(idx)}
                disabled={idx === events.length - 1}
                className="w-6 h-5 flex items-center justify-center rounded text-[10px] theme-faint hover:theme-text hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 transition-colors"
              >▼</button>
            </div>
          )}

          {/* Remove */}
          <button
            type="button"
            onClick={() => onRemove(event.id)}
            className="text-xs theme-faint hover:text-red-500 transition-colors shrink-0 px-0.5"
          >
            ✕
          </button>
        </div>
      ))}

      {events.length >= 2 && (
        <button
          type="button"
          onClick={onBuildItinerary}
          disabled={building}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 mt-1"
          style={{ backgroundColor: 'var(--primary, #E8601C)', color: '#fff' }}
        >
          {building ? 'Building…' : 'Build My Itinerary →'}
        </button>
      )}
      {events.length === 1 && (
        <p className="text-[10px] theme-faint text-center">Add at least 2 events or places to see a route</p>
      )}
    </div>
  );
}
