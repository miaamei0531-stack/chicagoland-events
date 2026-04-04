import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import SourceBadge from './SourceBadge.jsx';
import CommentThread from '../Community/CommentThread.jsx';
import { formatDateTime } from '../../utils/formatDate.js';
import { CATEGORY_COLORS } from '../../utils/categoryColors.js';

export default function EventDetailPanel({ eventId, onClose }) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getEvent(eventId)
      .then(setEvent)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-96 bg-white shadow-xl z-10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Event Details</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>
      )}

      {!loading && !event && (
        <div className="flex-1 flex items-center justify-center text-gray-400">Event not found.</div>
      )}

      {!loading && event && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Source badge */}
          <div>
            <SourceBadge isUserSubmitted={event.is_user_submitted} />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 leading-snug">{event.title}</h2>

          {/* Categories */}
          {event.category?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.category.map((cat) => (
                <span key={cat} className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}>
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* Date & time */}
          <div className="text-sm text-gray-700 space-y-0.5">
            <div className="font-medium">{formatDateTime(event.start_datetime)}</div>
            {event.end_datetime && (
              <div className="text-gray-500">Until {formatDateTime(event.end_datetime)}</div>
            )}
            {event.is_recurring && (
              <div className="text-community font-medium text-xs">Recurring event</div>
            )}
          </div>

          {/* Location */}
          {(event.venue_name || event.address) && (
            <div className="text-sm text-gray-700">
              {event.venue_name && <div className="font-medium">{event.venue_name}</div>}
              {event.address && <div className="text-gray-500">{event.address}</div>}
              {event.neighborhood && <div className="text-gray-400 text-xs">{event.neighborhood}{event.city ? `, ${event.city}` : ''}</div>}
            </div>
          )}

          {/* Cost */}
          <div className="text-sm">
            {event.is_free ? (
              <span className="text-green-600 font-semibold">Free</span>
            ) : (
              <span className="text-gray-700">
                {event.price_min != null && event.price_max != null && event.price_min !== event.price_max
                  ? `$${event.price_min} – $${event.price_max}`
                  : event.price_min != null
                  ? `$${event.price_min}`
                  : 'Paid'}
              </span>
            )}
            {event.price_notes && (
              <div className="text-gray-400 text-xs mt-0.5">{event.price_notes}</div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
          )}

          {/* Links */}
          <div className="space-y-2 pt-2">
            {event.official_url && (
              <a
                href={event.official_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-official text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Official Page
              </a>
            )}
            {event.ticket_url && (
              <a
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center border border-official text-official text-sm font-medium py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Get Tickets
              </a>
            )}
          </div>

          {/* Comments */}
          <CommentThread eventId={eventId} />
        </div>
      )}
    </div>
  );
}
