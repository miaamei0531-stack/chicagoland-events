import { useState, useEffect } from 'react';

const LOADING_MSGS = [
  'Checking the weather…',
  'Finding the best route…',
  'Almost ready…',
];

function LoadingState() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LOADING_MSGS.length), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <div className="w-7 h-7 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs theme-muted">{LOADING_MSGS[idx]}</p>
    </div>
  );
}

function Stop({ stop, isLast }) {
  const isEvent = stop.type === 'event';
  const isSuggestion = stop.type === 'suggestion';
  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${isEvent ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
        {!isLast && <div className="w-px flex-1 bg-[var(--border-subtle)] mt-1" style={{ minHeight: '1.5rem' }} />}
      </div>
      <div className={`flex-1 pb-3 ${isSuggestion ? 'opacity-75' : ''}`}>
        <div className={`p-2.5 rounded-lg border text-xs ${
          isSuggestion
            ? 'theme-surface2 border-[var(--border-subtle)] bg-[var(--bg)]'
            : 'theme-surface border-[var(--border-subtle)]'
        }`}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="font-semibold theme-faint">{stop.time}</span>
            {stop.duration_minutes && <span className="theme-faint">{stop.duration_minutes}m</span>}
          </div>
          <p className="font-semibold theme-text text-sm">{stop.title}</p>
          {stop.description && <p className="theme-muted mt-0.5 leading-relaxed">{stop.description}</p>}
        </div>
        {stop.travel_to_next && (
          <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] theme-faint">
            <span>{stop.travel_to_next.mode === 'walking' ? '🚶' : stop.travel_to_next.mode === 'transit' ? '🚌' : '🚗'}</span>
            <span>{stop.travel_to_next.duration_minutes}m{stop.travel_to_next.note ? ` · ${stop.travel_to_next.note}` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ItineraryView({ itinerary, weather, dateLabel, onSave, onStartOver, saving }) {
  if (!itinerary) return <LoadingState />;

  const stops = Array.isArray(itinerary.itinerary) ? itinerary.itinerary : itinerary.itinerary?.itinerary || [];
  const summary = itinerary.summary || itinerary.itinerary?.summary;

  return (
    <div className="space-y-3">
      {/* Weather banner */}
      {weather && (
        <div className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${
          weather.outdoorSuitable ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <span>{weather.emoji}</span>
          <span>{dateLabel} — {weather.tempHighF}°F · {weather.summary}</span>
        </div>
      )}

      {summary && <p className="text-xs theme-muted leading-relaxed">{summary}</p>}

      {/* Stops */}
      <div>
        {stops.map((stop, i) => (
          <Stop key={i} stop={stop} isLast={i === stops.length - 1} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-2 rounded-lg theme-btn-accent text-xs font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving…' : '💾 Save Plan'}
        </button>
        <button
          onClick={onStartOver}
          className="flex-1 py-2 rounded-lg theme-surface2 border border-[var(--border-subtle)] text-xs font-medium theme-muted hover:border-[var(--accent)] transition-colors"
        >
          Start Over
        </button>
      </div>
    </div>
  );
}

export { LoadingState };
