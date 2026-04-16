import { CATEGORY_COLORS } from '../../utils/categoryColors.js';
import { formatDateTime } from '../../utils/formatDate.js';

export default function PlanEventCard({ event, isAdded, isSelected, onAdd, onRemove, onSelect }) {
  if (!event) return null;

  return (
    <button
      onClick={() => onSelect(event.id)}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? 'border-[var(--accent)] ring-2 ring-[var(--accent)] ring-opacity-30 theme-surface'
          : isAdded
          ? 'border-l-[3px] border-l-green-500 border-[var(--border-subtle)] theme-surface'
          : 'border-[var(--border-subtle)] theme-surface hover:border-[var(--accent)]'
      }`}
    >
      {/* Row 1: Title + category */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isAdded && <span className="text-green-500 text-xs shrink-0">✓</span>}
            <h3 className="text-sm font-semibold theme-text truncate">{event.title}</h3>
          </div>
        </div>
        {event.category?.length > 0 && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${CATEGORY_COLORS[event.category[0]] || 'bg-gray-100 text-gray-600'}`}>
            {event.category[0]}
          </span>
        )}
      </div>

      {/* Row 2: Time + venue */}
      <div className="flex items-center gap-1.5 mt-1">
        <span className="text-xs theme-faint">{formatDateTime(event.start_datetime)}</span>
        {event.venue_name && (
          <>
            <span className="text-xs theme-faint">·</span>
            <span className="text-xs theme-faint truncate">{event.venue_name}</span>
          </>
        )}
      </div>

      {/* Row 3: Price + add button */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs theme-faint">
          {event.is_free ? 'Free' : event.price_min ? `$${event.price_min}+` : ''}
        </span>
        {isAdded ? (
          <span
            onClick={(e) => { e.stopPropagation(); onRemove(event.id); }}
            className="text-[10px] px-2.5 py-1 rounded-full border border-red-200 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            Remove
          </span>
        ) : (
          <span
            onClick={(e) => { e.stopPropagation(); onAdd(event); }}
            className="text-[10px] px-2.5 py-1 rounded-full theme-btn-accent font-semibold cursor-pointer"
          >
            + Add
          </span>
        )}
      </div>
    </button>
  );
}
