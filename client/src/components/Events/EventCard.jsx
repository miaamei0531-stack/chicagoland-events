import { formatDate } from '../../utils/formatDate.js';
import { CATEGORY_COLORS } from '../../utils/categoryColors.js';
import SourceBadge from './SourceBadge.jsx';

export default function EventCard({ event, onClick }) {
  return (
    <button
      onClick={() => onClick(event.id)}
      className="w-full text-left p-3 rounded-2xl border theme-border-s hover:border-[var(--accent)] theme-surface hover:theme-surface2 transition-all duration-150 space-y-1.5 group theme-shadow-hover"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm theme-text leading-snug group-hover:text-[var(--accent)] transition-colors">
          {event.title}
        </span>
        <SourceBadge isUserSubmitted={event.is_user_submitted} />
      </div>

      <div className="text-xs theme-muted">{formatDate(event.start_datetime)}</div>

      {event.venue_name && (
        <div className="text-xs theme-faint truncate">{event.venue_name}</div>
      )}

      <div className="flex flex-wrap gap-1">
        {(event.category || []).slice(0, 2).map((cat) => (
          <span key={cat} className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-500'}`}>
            {cat}
          </span>
        ))}
        {event.is_free && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Free</span>
        )}
      </div>
    </button>
  );
}
