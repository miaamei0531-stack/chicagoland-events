import { useState, useEffect } from 'react';

const LOADING_MSGS = [
  'Checking the weather…',
  'Calculating travel times…',
  'Finding lunch spots along the route…',
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

// ─── Travel indicator between stops ────────────────────────────────────────

function TravelIndicator({ travel }) {
  if (!travel) return null;
  const icon = travel.mode === 'walk' ? '🚶' : travel.mode === 'transit' ? '🚌' : '🚗';
  return (
    <div className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] theme-faint">
      <div className="w-px h-3 bg-[var(--border-subtle)]" />
      <span>{icon}</span>
      <span>{travel.duration}{travel.note ? ` · ${travel.note}` : ''}</span>
      <div className="w-px h-3 bg-[var(--border-subtle)]" />
    </div>
  );
}

// ─── Event stop ────────────────────────────────────────────────────────────

function EventStop({ stop }) {
  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center pt-1">
        <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-[var(--accent)]" />
        <div className="w-px flex-1 bg-[var(--border-subtle)] mt-1" />
      </div>
      <div className="flex-1 pb-1">
        <div className="p-2.5 rounded-lg border theme-surface border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{stop.time}</span>
          </div>
          <p className="text-sm font-bold theme-text">{stop.title}</p>
          {stop.venue && <p className="text-xs theme-faint mt-0.5">{stop.venue}</p>}
          {stop.description && <p className="text-xs theme-muted mt-1 leading-relaxed">{stop.description}</p>}
        </div>
        {stop.travel_to_next && <TravelIndicator travel={stop.travel_to_next} />}
      </div>
    </div>
  );
}

// ─── Suggestion stop ───────────────────────────────────────────────────────

function SuggestionStop({ stop }) {
  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center pt-1">
        <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-[var(--border)]" />
        <div className="w-px flex-1 bg-[var(--border-subtle)] mt-1" />
      </div>
      <div className="flex-1 pb-1">
        <div className="p-2.5 rounded-lg border border-[var(--border-subtle)]" style={{ backgroundColor: '#F5F0EA' }}>
          <p className="text-[10px] theme-faint mb-0.5">💡 Suggestion</p>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs font-semibold theme-faint">{stop.time}</span>
          </div>
          <p className="text-sm font-semibold theme-text">{stop.title}</p>
          {stop.venue && <p className="text-xs theme-faint mt-0.5">{stop.venue}</p>}
          {stop.description && <p className="text-xs theme-muted mt-1 italic leading-relaxed">{stop.description}</p>}
        </div>
        {stop.travel_to_next && <TravelIndicator travel={stop.travel_to_next} />}
      </div>
    </div>
  );
}

// ─── Main ItineraryView ────────────────────────────────────────────────────

export default function ItineraryView({ itinerary, weather, dateLabel, onSave, onStartOver, saving }) {
  if (!itinerary) return <LoadingState />;

  // Handle both old format { itinerary: { stops } } and new { stops }
  const data = itinerary.itinerary || itinerary;
  const stops = data.stops || data.itinerary || [];
  const summary = data.summary || '';
  const warnings = data.warnings || [];

  return (
    <div className="space-y-3">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.map((w, i) => (
            <div key={i} className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-1.5">
              <span>⚠️</span><span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Day summary */}
      {summary && (
        <div className="px-3 py-2.5 rounded-lg border border-[var(--border-subtle)]" style={{ backgroundColor: '#FAF5EE' }}>
          <p className="text-xs theme-muted italic leading-relaxed">{summary}</p>
        </div>
      )}

      {/* Weather */}
      {weather && (
        <div className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${
          weather.outdoorSuitable ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <span>{weather.emoji}</span>
          <span>{dateLabel} — {weather.tempHighF}°F · {weather.summary}</span>
        </div>
      )}

      {/* Stops */}
      {stops.length > 0 ? (
        <div>
          {stops.map((stop, i) => {
            if (stop.type === 'suggestion') {
              return <SuggestionStop key={i} stop={stop} />;
            }
            return <EventStop key={i} stop={stop} />;
          })}
        </div>
      ) : (
        <p className="text-xs theme-faint text-center py-4">No stops in this itinerary.</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
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
