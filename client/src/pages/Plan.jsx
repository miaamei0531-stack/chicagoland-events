import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Layout/Navbar.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { api } from '../services/api.js';
import { supabase } from '../services/supabase.js';
import { CATEGORY_COLORS } from '../utils/categoryColors.js';
import { formatDateTime } from '../utils/formatDate.js';

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="p-4 rounded-2xl border border-[var(--border-subtle)] theme-surface animate-pulse space-y-2">
      <div className="h-4 rounded-full theme-surface2 w-2/3" />
      <div className="h-3 rounded-full theme-surface2 w-1/3" />
      <div className="h-3 rounded-full theme-surface2 w-1/2" />
    </div>
  );
}

// ─── Rotating loading messages ────────────────────────────────────────────────
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

// ─── Day selector card ────────────────────────────────────────────────────────
function DayCard({ label, date, weather, selected, onClick }) {
  const cond = weather?.condition;
  const emoji = weather?.emoji ?? '🌤️';
  const temp = weather?.tempHighF;
  const good = weather?.outdoorSuitable;

  return (
    <button
      onClick={onClick}
      className={`flex-1 p-4 rounded-2xl border-2 transition-all text-left ${
        selected
          ? 'border-[var(--accent)] theme-surface2'
          : 'border-[var(--border-subtle)] theme-surface2 hover:border-[var(--accent)]'
      }`}
    >
      <p className="text-xs font-semibold theme-muted uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{emoji}</span>
        {temp && <span className="text-lg font-bold theme-text">{temp}°F</span>}
      </div>
      {weather && (
        <p className={`text-xs leading-tight ${good ? 'text-green-600' : 'text-amber-600'}`}>
          {weather.summary}
        </p>
      )}
      {!weather && <p className="text-xs theme-faint">Loading forecast…</p>}
    </button>
  );
}

// ─── Recommendation card ──────────────────────────────────────────────────────
function RecommendationCard({ rec, inDay, onAdd, onRemove }) {
  const { event, reason, fit_score, weather_note, suggested_time } = rec;
  if (!event) return null;

  const scoreColor =
    fit_score >= 80 ? 'bg-green-500' : fit_score >= 60 ? 'bg-amber-400' : 'bg-gray-300';

  return (
    <div className="p-4 rounded-2xl border border-[var(--border-subtle)] theme-surface space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold theme-text truncate">{event.title}</h3>
          {event.venue_name && (
            <p className="text-xs theme-faint truncate">{event.venue_name}</p>
          )}
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

      {reason && <p className="text-xs theme-muted italic">"{reason}"</p>}
      {weather_note && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <span>☀️</span> {weather_note}
        </p>
      )}
      {suggested_time && (
        <p className="text-xs theme-faint flex items-center gap-1">
          <span>⏱</span> {suggested_time}
        </p>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs theme-faint">{formatDateTime(event.start_datetime)}</span>
        {inDay ? (
          <button
            onClick={() => onRemove(event.id)}
            className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={() => onAdd(event)}
            className="text-xs px-3 py-1.5 rounded-full theme-btn-accent font-medium"
          >
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
    <div className="relative">
      {/* Timeline dot + line */}
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${isEvent ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
          {!isLast && <div className="w-px flex-1 bg-[var(--border-subtle)] mt-1 mb-1" style={{ minHeight: '2.5rem' }} />}
        </div>

        <div className={`flex-1 pb-5 ${isSuggestion ? 'opacity-75' : ''}`}>
          <div className={`p-3.5 rounded-xl border ${isEvent ? 'theme-surface border-[var(--border-subtle)]' : 'theme-surface2 border-[var(--border-subtle)]'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold theme-faint">{stop.time}</span>
              {stop.duration_minutes && (
                <span className="text-xs theme-faint">{stop.duration_minutes} min</span>
              )}
            </div>
            <p className="text-sm font-semibold theme-text">{stop.title}</p>
            {stop.description && (
              <p className="text-xs theme-muted mt-1 leading-relaxed">{stop.description}</p>
            )}
          </div>

          {stop.travel_to_next && (
            <div className="flex items-center gap-2 mt-2 px-2">
              <span className="text-xs theme-faint">
                {stop.travel_to_next.mode === 'walking' ? '🚶' : stop.travel_to_next.mode === 'transit' ? '🚌' : '🚗'}
              </span>
              <span className="text-xs theme-faint">
                {stop.travel_to_next.duration_minutes} min
                {stop.travel_to_next.note ? ` · ${stop.travel_to_next.note}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Plan page ───────────────────────────────────────────────────────────
export default function Plan() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Day selection
  const [selectedDay, setSelectedDay] = useState('saturday');
  const [weekend, setWeekend] = useState({ saturday: null, sunday: null });

  // Recommendations
  const [recs, setRecs] = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState(false);

  // My Day — events user has added
  const [myDay, setMyDay] = useState([]);

  // Itinerary
  const [itinerary, setItinerary] = useState(null);
  const [itineraryBuilding, setItineraryBuilding] = useState(false);

  // Saved state
  const [saving, setSaving] = useState(false);
  const [savedToken, setSavedToken] = useState(null);
  const [copyMsg, setCopyMsg] = useState('');

  // Load weekend weather on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/weather`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setWeekend({ saturday: data.saturday, sunday: data.sunday });
      })
      .catch(() => null);
  }, []);

  // Load recommendations when day changes or user logs in
  const loadRecs = useCallback(async () => {
    if (!user) return;
    setRecsLoading(true);
    setRecsError(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const data = await api.getRecommendations(selectedDay, session?.access_token);
      setRecs(data);
    } catch {
      setRecsError(true);
    } finally {
      setRecsLoading(false);
    }
  }, [user, selectedDay]);

  useEffect(() => {
    loadRecs();
    setMyDay([]);
    setItinerary(null);
    setSavedToken(null);
  }, [selectedDay, user]);

  function addToDay(event) {
    setMyDay((prev) => prev.find((e) => e.id === event.id) ? prev : [...prev, event]);
    setItinerary(null); // reset itinerary when day changes
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
      const dateStr = recs?.date || (selectedDay === 'saturday'
        ? getSaturdayDateStr()
        : getSundayDateStr());
      const data = await api.buildItinerary(
        { event_ids: myDay.map((e) => e.id), date: dateStr },
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
      const dateStr = recs?.date || getSaturdayDateStr();
      const data = await api.saveItinerary(
        {
          date: dateStr,
          title: `My ${selectedDay === 'saturday' ? 'Saturday' : 'Sunday'} Plan`,
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

  const weatherForDay = selectedDay === 'saturday' ? weekend.saturday : weekend.sunday;
  const dayLabel = selectedDay === 'saturday' ? 'Saturday' : 'Sunday';
  const myDayIds = new Set(myDay.map((e) => e.id));

  return (
    <div className="min-h-screen theme-bg pb-20 md:pb-8">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold theme-text">Plan a Day</h1>
          <p className="text-sm theme-muted mt-1">
            {user ? 'AI-curated picks based on your preferences and the weekend weather.' : 'Sign in to get personalized recommendations.'}
          </p>
        </div>

        {/* Section 1 — Pick Your Day */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold theme-muted uppercase tracking-widest mb-3">Pick Your Day</h2>
          <div className="flex gap-3">
            <DayCard
              label="Saturday"
              date={getSaturdayDateStr()}
              weather={weekend.saturday}
              selected={selectedDay === 'saturday'}
              onClick={() => setSelectedDay('saturday')}
            />
            <DayCard
              label="Sunday"
              date={getSundayDateStr()}
              weather={weekend.sunday}
              selected={selectedDay === 'sunday'}
              onClick={() => setSelectedDay('sunday')}
            />
          </div>
        </section>

        {/* Section 2 — Recommendations */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold theme-muted uppercase tracking-widest">
              {user ? `Picks for You — ${dayLabel}` : `Events — ${dayLabel}`}
            </h2>
            {recs?.day_summary && (
              <button onClick={loadRecs} className="text-xs theme-faint hover:theme-muted transition-colors">Refresh</button>
            )}
          </div>

          {/* Weather advisory */}
          {recs?.weather_advisory && (
            <div className="mb-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
              <span>🌧️</span>
              <span>{recs.weather_advisory}</span>
            </div>
          )}

          {/* Day summary */}
          {recs?.day_summary && (
            <p className="text-sm theme-muted mb-4 leading-relaxed">{recs.day_summary}</p>
          )}

          {!user && (
            <div className="p-6 rounded-2xl theme-surface2 border border-[var(--border-subtle)] text-center">
              <p className="text-sm theme-muted mb-3">Sign in to get personalized picks based on your taste and the weather.</p>
              <p className="text-xs theme-faint">Your preferences are used to rank events — no data shared.</p>
            </div>
          )}

          {user && recsLoading && (
            <div className="space-y-3">
              <SkeletonCard /><SkeletonCard /><SkeletonCard />
            </div>
          )}

          {user && recsError && (
            <div className="p-4 rounded-2xl theme-surface2 border border-[var(--border-subtle)] text-center">
              <p className="text-sm theme-muted mb-2">Personalized picks unavailable right now.</p>
              <button onClick={loadRecs} className="text-xs theme-faint hover:theme-muted">Try again</button>
            </div>
          )}

          {user && !recsLoading && !recsError && recs?.recommendations?.length === 0 && (
            <div className="p-5 rounded-2xl theme-surface2 border border-[var(--border-subtle)] text-center">
              <p className="text-sm theme-muted mb-2">No events found for {dayLabel} matching your preferences.</p>
              <button onClick={() => navigate('/preferences')} className="text-xs text-[var(--accent)] font-medium">
                Update preferences →
              </button>
            </div>
          )}

          {user && !recsLoading && recs?.recommendations?.length > 0 && (
            <div className="space-y-3">
              {recs.recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.event_id}
                  rec={rec}
                  inDay={myDayIds.has(rec.event_id)}
                  onAdd={addToDay}
                  onRemove={removeFromDay}
                />
              ))}
            </div>
          )}
        </section>

        {/* Section 3 — My Day */}
        {user && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold theme-muted uppercase tracking-widest mb-3">My Day</h2>

            {myDay.length === 0 ? (
              <div className="p-5 rounded-2xl border border-dashed border-[var(--border)] theme-surface2 text-center">
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
                    <button
                      onClick={() => removeFromDay(event.id)}
                      className="text-xs theme-faint hover:text-red-500 transition-colors px-2 py-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {myDay.length >= 2 && !itinerary && (
                  <button
                    onClick={handleBuildItinerary}
                    disabled={itineraryBuilding}
                    className="w-full mt-3 py-3 rounded-xl theme-btn-accent text-sm font-semibold disabled:opacity-60 transition-all"
                  >
                    {itineraryBuilding ? 'Building your day…' : 'Build My Itinerary →'}
                  </button>
                )}
                {myDay.length === 1 && (
                  <p className="text-xs theme-faint text-center mt-2">Add one more event to build an itinerary</p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Building state */}
        {itineraryBuilding && <BuildingState />}

        {/* Section 4 — Itinerary */}
        {itinerary && !itineraryBuilding && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold theme-muted uppercase tracking-widest">My Itinerary</h2>
              <div className="flex items-center gap-2 text-xs theme-faint">
                {itinerary.itinerary?.total_duration_hours > 0 && (
                  <span>{itinerary.itinerary.total_duration_hours}h</span>
                )}
                {itinerary.itinerary?.total_distance_km > 0 && (
                  <span>{itinerary.itinerary.total_distance_km} km</span>
                )}
              </div>
            </div>

            {/* Weather banner */}
            {weatherForDay && (
              <div className={`mb-4 px-4 py-3 rounded-xl border text-sm flex items-center gap-2 ${
                weatherForDay.outdoorSuitable
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}>
                <span>{weatherForDay.emoji}</span>
                <span>{dayLabel} — {weatherForDay.tempHighF}°F · {weatherForDay.summary}</span>
              </div>
            )}

            {/* Day summary */}
            {(itinerary.summary || (itinerary.itinerary && itinerary.itinerary.summary)) && (
              <p className="text-sm theme-muted mb-5 leading-relaxed">
                {itinerary.summary || itinerary.itinerary?.summary}
              </p>
            )}

            {/* Stops */}
            <div>
              {(Array.isArray(itinerary.itinerary) ? itinerary.itinerary : itinerary.itinerary?.itinerary || []).map((stop, i, arr) => (
                <ItineraryStop key={i} stop={stop} isLast={i === arr.length - 1} />
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2">
              {!savedToken ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl theme-surface2 border border-[var(--border-subtle)] text-sm font-medium theme-text hover:border-[var(--accent)] transition-colors disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : '💾 Save Plan'}
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl theme-btn-accent text-sm font-semibold disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : '🔗 Save & Share'}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl theme-surface2 border border-[var(--border-subtle)]">
                  <p className="text-xs font-semibold theme-text mb-2">Your shareable link:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs theme-faint bg-[var(--bg)] px-3 py-2 rounded-lg truncate">
                      {window.location.origin}/plan/share/{savedToken}
                    </code>
                    <button
                      onClick={copyShareLink}
                      className="text-xs px-3 py-2 rounded-lg theme-btn-accent font-medium whitespace-nowrap"
                    >
                      {copyMsg || 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function getSaturdayDateStr() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 6 ? 0 : 6 - day));
  return d.toISOString().split('T')[0];
}

function getSundayDateStr() {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  return d.toISOString().split('T')[0];
}
