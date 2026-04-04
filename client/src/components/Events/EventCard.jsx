import { formatDate } from '../../utils/formatDate.js';
import { CATEGORY_COLORS } from '../../utils/categoryColors.js';
import SourceBadge from './SourceBadge.jsx';

export default function EventCard({ event, onClick }) {
  return (
    <button
      onClick={() => onClick(event.id)}
      className="w-full text-left p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors space-y-1.5"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm text-gray-900 leading-snug">{event.title}</span>
        <SourceBadge isUserSubmitted={event.is_user_submitted} />
      </div>

      <div className="text-xs text-gray-500">{formatDate(event.start_datetime)}</div>

      {event.venue_name && (
        <div className="text-xs text-gray-400 truncate">{event.venue_name}</div>
      )}

      <div className="flex flex-wrap gap-1">
        {(event.category || []).slice(0, 2).map((cat) => (
          <span key={cat} className={`text-xs px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-500'}`}>
            {cat}
          </span>
        ))}
        {event.is_free && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Free</span>
        )}
      </div>
    </button>
  );
}
