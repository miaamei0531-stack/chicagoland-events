import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar.jsx';
import MapView from '../components/Map/MapView.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../services/api.js';
import { supabase } from '../services/supabase.js';
import { CATEGORY_COLORS, CATEGORY_HEX } from '../utils/categoryColors.js';
import { formatDateTime } from '../utils/formatDate.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="p-4 rounded-2xl border border-[var(--border-subtle)] theme-surface animate-pulse space-y-2">
      <div className="h-4 rounded-full theme-surface2 w-2/3" />
      <div className="h-3 rounded-full theme-surface2 w-1/3" />
      <div className="h-3 rounded-full theme-surface2 w-1/2" />
    </div>
  );
}

const LOADING_MSGS = [
  'Checking the weather…',
  'Finding events you\'ll love…',
  'Planning the best route…',
  'Adding some local gems…',
];

function BuildingState() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % LOADING_MSGS.length), 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      <p className="text-sm theme-muted">{LOADING_MSGS[idx]}</p>
    </div>
  );
}

// ─── Calendar Day Picker ──────────────────────────────────────────────────────

function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

function CalendarPicker({ selectedDate, onSelectDate, weatherMap }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const { firstDay, daysInMonth } = getMonthDays(viewYear, viewMonth);
  const monthName = new Date(viewYear, viewMonth).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const todayStr = today.toISOString().split('T')[0];

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  function dateStr(day) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <div className="theme-surface rounded-2xl border border-[var(--border-subtle)] p-4">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full theme-surface2 border border-[var(--border-subtle)] theme-muted hover:theme-text text-sm">←</button>
        <span className="text-sm font-semibold theme-text">{monthName}</span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full theme-surface2 border border-[var(--border-subtle)] theme-muted hover:theme-text text-sm">→</button>
      </div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold theme-faint uppercase">{d}</div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const ds = dateStr(day);
          const isSelected = ds === selectedDate;
          const isToday = ds === todayStr;
          const isPast = ds < todayStr;
          const weather = weatherMap?.[ds];

          return (
            <button
              key={day}
              onClick={() => !isPast && onSelectDate(ds)}
              disabled={isPast}
              className={`flex flex-col items-center py-1 rounded-xl transition-all text-xs ${
                isSelected
                  ? 'bg-[var(--accent)] text-white'
                  : isToday
                  ? 'border border-[var(--accent)] theme-text'
                  : isPast
                  ? 'theme-faint opacity-40'
                  : 'theme-text hover:theme-surface2'
              }`}
            >
              <span className="font-medium leading-tight">{day}</span>
              {weather && (
                <div className="flex flex-col items-center leading-none mt-0.5">
                  <span className="text-[10px]">{weather.emoji}</span>
                  <span className={`text-[8px] ${isSelected ? 'text-white/80' : 'theme-faint'}`}>{weather.tempHighF}°</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recommendation / Event card ──────────────────────────────────────────────

function EventCard({ event, reason, fit_score, inDay, onAdd, onRemove, onHover }) {
  if (!event) return null;
  const scoreColor = fit_score >= 80 ? 'bg-green-500' : fit_score >= 60 ? 'bg-amber-400' : 'bg-gray-300';

  return (
    <div
      className="p-3.5 rounded-2xl border border-[var(--border-subtle)] theme-surface space-y-2 hover:border-[var(--accent)] transition-colors cursor-pointer"
      onMouseEnter={() => onHover?.(event.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold theme-text truncate">{event.title}</h3>
          {event.venue_name && <p className="text-xs theme-faint truncate">{event.venue_name}</p>}
        </div>
        {fit_score != null && (
          <div className="flex items-center gap-1 shrink-0">
            <div className={`w-2 h-2 rounded-full ${scoreColor}`} />
            <span className="text-xs theme-faint">{fit_score}%</span>
          </div>
        )}
      </div>

      {event.category?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {event.category.slice(0, 3).map((cat) => (
            <span key={cat} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}>
              {cat}
            </span>
          ))}
        </div>
      )}

      {reason && <p className="text-xs theme-muted italic leading-snug">"{reason}"</p>}

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs theme-faint">{formatDateTime(event.start_datetime)}</span>
        {inDay ? (
          <button onClick={(e) => { e.stopPropagation(); onRemove(event.id); }} className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
            Remove
          </button>
        ) : (
          <button onClick={(e) => { e.stopPropagation(); onAdd(event); }} className="text-xs px-3 py-1.5 rounded-full theme-btn-accent font-medium">
            + Add to My Day
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Itinerary stop ───────────────────────────────────────────────────────────

function ItineraryStop({ stop, isLast }) {
  const isEvent = stop.type === 'event';
  const isSuggestion = stop.type === 'suggestion';
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${isEvent ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
        {!isLast && <div className="w-px flex-1 bg-[var(--border-subtle)] mt-1 mb-1" style={{ minHeight: '2rem' }} />}
      </div>
      <div className={`flex-1 pb-4 ${isSuggestion ? 'opacity-75' : ''}`}>
        <div className={`p-3 rounded-xl border ${isEvent ? 'theme-surface border-[var(--border-subtle)]' : 'theme-surface2 border-[var(--border-subtle)]'}`}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs font-semibold theme-faint">{stop.time}</span>
            {stop.duration_minutes && <span className="text-xs theme-faint">{stop.duration_minutes} min</span>}
          </div>
          <p className="text-sm font-semibold theme-text">{stop.title}</p>
          {stop.description && <p className="text-xs theme-muted mt-1 leading-relaxed">{stop.description}</p>}
        </div>
        {stop.travel_to_next && (
          <div className="flex items-center gap-2 mt-1.5 px-2">
            <span className="text-xs theme-faint">{stop.travel_to_next.mode === 'walking' ? '🚶' : stop.travel_to_next.mode === 'transit' ? '🚌' : '🚗'}</span>
            <span className="text-xs theme-faint">{stop.travel_to_next.duration_minutes} min{stop.travel_to_next.note ? ` · ${stop.travel_to_next.note}` : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Plan page ───────────────────────────────────────────────────────────

export default function Plan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const BASE = import.meta.env.VITE_API_BASE_URL;

  // Date selection — YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Weather cache: { 'YYYY-MM-DD': { emoji, tempHighF, ... } }
  const [weatherMap, setWeatherMap] = useState({});

  // Recommendations / popular events
  const [recs, setRecs] = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState(false);

  // My Day
  const [myDay, setMyDay] = useState([]);

  // Itinerary
  const [itinerary, setItinerary] = useState(null);
  const [itineraryBuilding, setItineraryBuilding] = useState(false);

  // Save
  const [saving, setSaving] = useState(false);
  const [savedToken, setSavedToken] = useState(null);
  const [copyMsg, setCopyMsg] = useState('');

  // Map hover (highlight event on map)
  const [hoveredEventId, setHoveredEventId] = useState(null);

  // ── Load weather for the next 7 days ──
  useEffect(() => {
    async function loadWeather() {
      const map = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        try {
          const res = await fetch(`${BASE}/weather?date=${ds}`);
          if (res.ok) map[ds] = await res.json();
        } catch { /* skip */ }
      }
      setWeatherMap(map);
    }
    loadWeather();
  }, [BASE]);

  // ── Load recommendations or popular events when date changes ──
  const loadRecs = useCallback(async () => {
    setRecsLoading(true);
    setRecsError(false);
    setRecs(null);

    try {
      // Try AI recommendations first (requires auth + ANTHROPIC_API_KEY)
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        try {
          const data = await api.getRecommendations(selectedDate, session?.access_token);
          if (data?.recommendations?.length > 0) {
            setRecs(data);
            setRecsLoading(false);
            return;
          }
        } catch {
          // AI recs failed — fall through to popular events
        }
      }

      // Fallback: fetch popular events for this date (no auth needed)
      const params = {
        north: 42.15, south: 41.60, east: -87.40, west: -88.40,
        start_date: selectedDate,
        end_date: selectedDate,
      };
      const events = await api.getEventsWithinBounds(params);

      // Sort by popularity heuristic: has venue > is_free > alphabetical
      const sorted = events
        .sort((a, b) => {
          const aScore = (a.venue_name ? 2 : 0) + (a.is_free ? 1 : 0);
          const bScore = (b.venue_name ? 2 : 0) + (b.is_free ? 1 : 0);
          return bScore - aScore;
        })
        .slice(0, 8);

      setRecs({
        date: selectedDate,
        weather: weatherMap[selectedDate] || null,
        recommendations: sorted.map((e) => ({
          event_id: e.id,
          event: e,
          reason: null,
          fit_score: null,
          weather_note: null,
          suggested_time: null,
        })),
        day_summary: sorted.length > 0
          ? `${sorted.length} events happening on this day in Chicagoland.`
          : null,
        weather_advisory: null,
      });
    } catch {
      setRecsError(true);
    } finally {
      setRecsLoading(false);
    }
  }, [user, selectedDate, weatherMap, BASE]);

  useEffect(() => {
    loadRecs();
    setMyDay([]);
    setItinerary(null);
    setSavedToken(null);
  }, [selectedDate]);

  // When user logs in, reload to try AI recs
  useEffect(() => { if (user) loadRecs(); }, [user]);

  function addToDay(event) {
    setMyDay((prev) => prev.find((e) => e.id === event.id) ? prev : [...prev, event]);
    setItinerary(null);
  }
  function removeFromDay(eventId) {
    setMyDay((prev) => prev.filter((e) => e.id !== eventId));
    setItinerary(null);
  }

  async function handleBuildItinerary() {
    if (myDay.length < 2) return;
    setItineraryBuilding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const data = await api.buildItinerary(
        { event_ids: myDay.map((e) => e.id), date: selectedDate },
        session?.access_token
      );
      setItinerary(data);
    } catch (err) {
      console.error('Failed to build itinerary:', err);
    } finally {
      setItineraryBuilding(false);
    }
  }

  async function handleSave(isPublic) {
    if (!itinerary) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const dayName = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      const data = await api.saveItinerary(
        {
          date: selectedDate,
          title: `My ${dayName} Plan`,
          itinerary_data: itinerary.itinerary,
          event_ids: myDay.map((e) => e.id),
          is_public: isPublic,
        },
        session?.access_token
      );
      if (data.share_token) setSavedToken(data.share_token);
    } catch (err) {
      console.error('Failed to save itinerary:', err);
    } finally {
      setSaving(false);
    }
  }

  function copyShareLink() {
    const url = `${window.location.origin}/plan/share/${savedToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    });
  }

  const weatherForDay = weatherMap[selectedDate];
  const dayLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const myDayIds = new Set(myDay.map((e) => e.id));

  // Build event IDs list for map highlighting
  const recEventIds = useMemo(() => {
    const ids = new Set(myDay.map((e) => e.id));
    recs?.recommendations?.forEach((r) => { if (r.event?.id) ids.add(r.event.id); });
    return ids;
  }, [recs, myDay]);

  return (
    <div className="flex flex-col h-screen theme-bg">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — Plan panel (scrollable) */}
        <div className="w-full md:w-[420px] lg:w-[460px] shrink-0 flex flex-col border-r theme-border-s overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-20 md:pb-8">

            {/* Header */}
            <div>
              <h1 className="text-xl font-bold theme-text">Plan a Day</h1>
              <p className="text-xs theme-muted mt-1">Pick a date, browse events, build your itinerary.</p>
            </div>

            {/* Section 1 — Calendar */}
            <section>
              <h2 className="text-xs font-semibold theme-muted uppercase tracking-widest mb-2">Pick Your Day</h2>
              <CalendarPicker
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                weatherMap={weatherMap}
              />
              {weatherForDay && (
                <div className={`mt-2 px-3 py-2 rounded-xl text-xs flex items-center gap-2 ${
                  weatherForDay.outdoorSuitable
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span>{weatherForDay.emoji}</span>
                  <span>{dayLabel} — {weatherForDay.tempHighF}°F · {weatherForDay.summary}</span>
                </div>
              )}
            </section>

            {/* Section 2 — Recommendations / Popular Events */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold theme-muted uppercase tracking-widest">
                  {user && recs?.recommendations?.[0]?.reason ? `Picks for You — ${dayLabel}` : `Popular — ${dayLabel}`}
                </h2>
                <button onClick={loadRecs} className="text-xs theme-faint hover:theme-muted transition-colors">Refresh</button>
              </div>

              {recs?.weather_advisory && (
                <div className="mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 flex items-start gap-2">
                  <span>🌧️</span><span>{recs.weather_advisory}</span>
                </div>
              )}
              {recs?.day_summary && <p className="text-xs theme-muted mb-3 leading-relaxed">{recs.day_summary}</p>}

              {recsLoading && <div className="space-y-2"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>}

              {recsError && (
                <div className="p-4 rounded-2xl theme-surface2 border border-[var(--border-subtle)] text-center">
                  <p className="text-sm theme-muted mb-2">Couldn't load events for this date.</p>
                  <button onClick={loadRecs} className="text-xs theme-faint hover:theme-muted">Try again</button>
                </div>
              )}

              {!recsLoading && !recsError && recs?.recommendations?.length === 0 && (
                <div className="p-4 rounded-2xl theme-surface2 border border-[var(--border-subtle)] text-center">
                  <p className="text-sm theme-muted">No events found for {dayLabel}.</p>
                  <p className="text-xs theme-faint mt-1">Try a different date.</p>
                </div>
              )}

              {!recsLoading && recs?.recommendations?.length > 0 && (
                <div className="space-y-2">
                  {recs.recommendations.map((rec) => (
                    <EventCard
                      key={rec.event_id}
                      event={rec.event}
                      reason={rec.reason}
                      fit_score={rec.fit_score}
                      inDay={myDayIds.has(rec.event_id)}
                      onAdd={addToDay}
                      onRemove={removeFromDay}
                      onHover={setHoveredEventId}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Section 3 — My Day */}
            <section>
              <h2 className="text-xs font-semibold theme-muted uppercase tracking-widest mb-2">My Day</h2>
              {myDay.length === 0 ? (
                <div className="p-4 rounded-2xl border border-dashed border-[var(--border)] theme-surface2 text-center">
                  <p className="text-sm theme-faint">Add events above to start building your day</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myDay.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-xl theme-surface border border-[var(--border-subtle)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium theme-text truncate">{event.title}</p>
                        <p className="text-xs theme-faint">{formatDateTime(event.start_datetime)}</p>
                      </div>
                      <button onClick={() => removeFromDay(event.id)} className="text-xs theme-faint hover:text-red-500 transition-colors px-2 py-1">✕</button>
                    </div>
                  ))}
                  {myDay.length >= 2 && !itinerary && (
                    <button onClick={handleBuildItinerary} disabled={itineraryBuilding} className="w-full mt-2 py-2.5 rounded-xl theme-btn-accent text-sm font-semibold disabled:opacity-60">
                      {itineraryBuilding ? 'Building…' : 'Build My Itinerary →'}
                    </button>
                  )}
                  {myDay.length === 1 && <p className="text-xs theme-faint text-center mt-1">Add one more event</p>}
                </div>
              )}
            </section>

            {/* Building state */}
            {itineraryBuilding && <BuildingState />}

            {/* Section 4 — Itinerary */}
            {itinerary && !itineraryBuilding && (
              <section>
                <h2 className="text-xs font-semibold theme-muted uppercase tracking-widest mb-3">My Itinerary</h2>
                {weatherForDay && (
                  <div className={`mb-3 px-3 py-2 rounded-xl border text-xs flex items-center gap-2 ${
                    weatherForDay.outdoorSuitable ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}>
                    <span>{weatherForDay.emoji}</span>
                    <span>{dayLabel} — {weatherForDay.tempHighF}°F</span>
                  </div>
                )}
                {(itinerary.summary || itinerary.itinerary?.summary) && (
                  <p className="text-xs theme-muted mb-4 leading-relaxed">{itinerary.summary || itinerary.itinerary?.summary}</p>
                )}
                <div>
                  {(Array.isArray(itinerary.itinerary) ? itinerary.itinerary : itinerary.itinerary?.itinerary || []).map((stop, i, arr) => (
                    <ItineraryStop key={i} stop={stop} isLast={i === arr.length - 1} />
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {!savedToken ? (
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(false)} disabled={saving} className="flex-1 py-2 rounded-xl theme-surface2 border border-[var(--border-subtle)] text-xs font-medium theme-text hover:border-[var(--accent)] disabled:opacity-60">
                        {saving ? 'Saving…' : '💾 Save'}
                      </button>
                      <button onClick={() => handleSave(true)} disabled={saving} className="flex-1 py-2 rounded-xl theme-btn-accent text-xs font-semibold disabled:opacity-60">
                        {saving ? 'Saving…' : '🔗 Save & Share'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl theme-surface2 border border-[var(--border-subtle)]">
                      <p className="text-xs font-semibold theme-text mb-1">Shareable link:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs theme-faint bg-[var(--bg)] px-2 py-1.5 rounded-lg truncate">{window.location.origin}/plan/share/{savedToken}</code>
                        <button onClick={copyShareLink} className="text-xs px-3 py-1.5 rounded-lg theme-btn-accent font-medium">{copyMsg || 'Copy'}</button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* RIGHT — Map (hidden on mobile, visible on md+) */}
        <div className="hidden md:flex flex-1 relative">
          <MapView
            selectedEventId={hoveredEventId}
            onSelectEvent={setHoveredEventId}
          />
        </div>
      </div>
    </div>
  );
}
