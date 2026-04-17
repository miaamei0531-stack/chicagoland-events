import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { usePlanStore } from '../../store/plan.js';

const PRICE_LABELS = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

const PLACE_CATEGORY_HEX = {
  Restaurant: '#E8601C',
  Coffee:     '#92400E',
  Bar:        '#6366F1',
  Park:       '#16A34A',
  Trail:      '#16A34A',
  Museum:     '#0EA5E9',
  'Movie Theater': '#EC4899',
  Spa:        '#D946EF',
  Shopping:   '#8B5CF6',
  Sports:     '#EAB308',
  'Live Music Venue': '#7C3AED',
};

const PLACE_CATEGORY_COLORS = {
  Restaurant: 'bg-orange-100 text-orange-700',
  Coffee: 'bg-amber-100 text-amber-700',
  Bar: 'bg-indigo-100 text-indigo-700',
  Park: 'bg-green-100 text-green-700',
  Trail: 'bg-green-100 text-green-700',
  Museum: 'bg-sky-100 text-sky-700',
  'Movie Theater': 'bg-rose-100 text-rose-700',
  Spa: 'bg-pink-100 text-pink-700',
  Shopping: 'bg-violet-100 text-violet-700',
  Sports: 'bg-yellow-100 text-yellow-700',
  'Live Music Venue': 'bg-purple-100 text-purple-700',
};

function getTodayHours(hours) {
  if (!hours) return null;
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = days[new Date().getDay()];
  return hours[today] || null;
}

function StarRating({ rating }) {
  if (!rating) return null;
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: full }).map((_, i) => <span key={i}>★</span>)}
      {half && <span>½</span>}
      <span className="text-xs theme-muted ml-1">{rating}</span>
    </span>
  );
}

export default function PlaceDetailPanel({ placeId, onClose }) {
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isPlanOpen, addToMyDay } = usePlanStore();

  useEffect(() => {
    setLoading(true);
    api.getPlace(placeId)
      .then(setPlace)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [placeId]);

  const todayHours = place ? getTodayHours(place.hours) : null;
  const isOpen = todayHours && todayHours.toLowerCase() !== 'closed';

  function handleAddToDay() {
    if (!place) return;
    // Convert place to a pseudo-event for Plan a Day
    addToMyDay({
      id: `place-${place.id}`,
      title: place.name,
      venue_name: place.address,
      start_datetime: null,
      is_place: true,
      place_id: place.id,
      coordinates: place.coordinates,
    });
  }

  return (
    <div className="absolute top-0 right-0 h-full w-full md:w-96 theme-surface theme-shadow-lg z-10 flex flex-col overflow-hidden border-l theme-border-s">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b theme-border-s">
        <span className="text-xs font-semibold theme-muted uppercase tracking-widest">Place Details</span>
        <button onClick={onClose} className="theme-faint hover:theme-text text-xl leading-none">&times;</button>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center theme-faint text-sm">Loading…</div>
      )}

      {!loading && !place && (
        <div className="flex-1 flex items-center justify-center theme-faint text-sm">Place not found.</div>
      )}

      {!loading && place && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Image */}
          {place.image_url && (
            <div className="rounded-xl overflow-hidden border theme-border-s">
              <img src={place.image_url} alt={place.name} className="w-full h-40 object-cover" />
            </div>
          )}

          {/* Name */}
          <h2 className="text-xl font-bold theme-text leading-snug">{place.name}</h2>

          {/* Rating + price */}
          <div className="flex items-center gap-3">
            <StarRating rating={place.rating} />
            {place.review_count && (
              <span className="text-xs theme-faint">({place.review_count} reviews)</span>
            )}
            {place.price_level && (
              <span className="text-sm font-medium theme-muted">{PRICE_LABELS[place.price_level]}</span>
            )}
          </div>

          {/* Categories */}
          {place.category?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {place.category.map((cat) => (
                <span key={cat} className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLACE_CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}>
                  {cat}
                </span>
              ))}
              {place.subcategory && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                  {place.subcategory}
                </span>
              )}
            </div>
          )}

          {/* Hours today */}
          {todayHours && (
            <div className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className={isOpen ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                {isOpen ? 'Open' : 'Closed'}
              </span>
              <span className="theme-muted">· {todayHours}</span>
            </div>
          )}

          {/* Address */}
          {place.address && (
            <div className="text-sm">
              <div className="theme-muted">{place.address}</div>
              {place.neighborhood && (
                <div className="theme-faint text-xs">{place.neighborhood}{place.city ? `, ${place.city}` : ''}</div>
              )}
            </div>
          )}

          {/* Description */}
          {place.description && (
            <p className="text-sm theme-muted leading-relaxed">{place.description}</p>
          )}

          {/* Insider tip */}
          {place.insider_tip && (
            <div className="px-3 py-2.5 rounded-lg border theme-border-s" style={{ backgroundColor: '#FAF5EE' }}>
              <p className="text-[10px] theme-faint mb-0.5">💡 Insider Tip</p>
              <p className="text-xs theme-muted italic leading-relaxed">{place.insider_tip}</p>
            </div>
          )}

          {/* Duration + best time */}
          <div className="flex flex-wrap gap-3 text-xs theme-muted">
            {place.typical_duration_minutes && (
              <span>⏱ {place.typical_duration_minutes} min typical visit</span>
            )}
            {place.best_time_to_visit && (
              <span>🕐 Best: {place.best_time_to_visit}</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            {place.website_url && (
              <a
                href={place.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center text-sm font-medium py-2 rounded-lg transition-colors"
                style={{ backgroundColor: PLACE_CATEGORY_HEX[place.category?.[0]] || '#8B5CF6', color: '#fff' }}
              >
                View on Google Maps
              </a>
            )}
            {isPlanOpen && (
              <button
                onClick={handleAddToDay}
                className="w-full text-center text-sm font-medium py-2 rounded-lg theme-surface2 border theme-border-s theme-muted hover:border-[var(--accent)] transition-colors"
              >
                + Add to My Day
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
