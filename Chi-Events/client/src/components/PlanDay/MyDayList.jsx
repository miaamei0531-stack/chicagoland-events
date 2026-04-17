import { useState, useRef } from 'react';
import { formatDateTime } from '../../utils/formatDate.js';

export default function MyDayList({ events, onRemove, onReorder, onBuildItinerary, building }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const dragItem = useRef(null);

  if (events.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-[var(--border)] theme-surface2 text-center">
        <p className="text-xs theme-faint">Tap "+" on events above to add them to your day</p>
      </div>
    );
  }

  function handleDragStart(idx) {
    dragItem.current = idx;
    setDragIdx(idx);
  }

  function handleDragOver(e, idx) {
    e.preventDefault();
    setOverIdx(idx);
  }

  function handleDrop(idx) {
    const from = dragItem.current;
    if (from === null || from === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const reordered = [...events];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(idx, 0, moved);
    onReorder(reordered);
    setDragIdx(null);
    setOverIdx(null);
    dragItem.current = null;
  }

  function handleDragEnd() {
    setDragIdx(null);
    setOverIdx(null);
    dragItem.current = null;
  }

  // Move up/down buttons for mobile (no drag support)
  function moveUp(idx) {
    if (idx === 0) return;
    const reordered = [...events];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    onReorder(reordered);
  }

  function moveDown(idx) {
    if (idx === events.length - 1) return;
    const reordered = [...events];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    onReorder(reordered);
  }

  return (
    <div className="space-y-1">
      {events.map((event, idx) => (
        <div
          key={event.id}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={() => handleDrop(idx)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-1.5 px-2 py-2 rounded-lg theme-surface border transition-all cursor-grab active:cursor-grabbing ${
            dragIdx === idx ? 'opacity-40 border-[var(--accent)]' :
            overIdx === idx ? 'border-[var(--accent)] bg-amber-50 dark:bg-amber-900/10' :
            'border-[var(--border-subtle)]'
          }`}
        >
          {/* Drag handle */}
          <span className="text-[10px] theme-faint cursor-grab shrink-0" title="Drag to reorder">⠿</span>

          {/* Number */}
          <span className={`text-xs font-bold w-5 shrink-0 text-center rounded-full ${
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
          <div className="flex flex-col shrink-0 gap-0.5">
            <button
              onClick={(e) => { e.stopPropagation(); moveUp(idx); }}
              disabled={idx === 0}
              className="w-5 h-4 flex items-center justify-center rounded text-[10px] leading-none theme-faint hover:theme-text hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 transition-colors"
              title="Move up"
            >▲</button>
            <button
              onClick={(e) => { e.stopPropagation(); moveDown(idx); }}
              disabled={idx === events.length - 1}
              className="w-5 h-4 flex items-center justify-center rounded text-[10px] leading-none theme-faint hover:theme-text hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 transition-colors"
              title="Move down"
            >▼</button>
          </div>

          {/* Remove */}
          <button
            onClick={() => onRemove(event.id)}
            className="text-xs theme-faint hover:text-red-500 transition-colors shrink-0 px-0.5"
          >
            ✕
          </button>
        </div>
      ))}

      {events.length >= 2 && (
        <button
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
