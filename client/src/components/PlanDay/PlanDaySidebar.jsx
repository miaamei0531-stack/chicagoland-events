import { useEffect, useCallback, useState, useRef } from 'react';
import { api } from '../../services/api.js';
import { supabase } from '../../services/supabase.js';
import { useAuth } from '../../hooks/useAuth.js';
import { usePlanStore } from '../../store/plan.js';
import { useFiltersStore } from '../../store/filters.js';
import DateScrollPicker from './DateScrollPicker.jsx';
import PlanEventCard from './PlanEventCard.jsx';
import PlanPlaceCard from './PlanPlaceCard.jsx';
import MyDayList from './MyDayList.jsx';
import ItineraryView, { LoadingState } from './ItineraryView.jsx';

const BASE = import.meta.env.VITE_API_BASE_URL;

export default function PlanDaySidebar({ selectedEventId, onSelectEvent, onClose }) {
  const { user } = useAuth();
  const { categories, searchQuery } = useFiltersStore();
  const {
    selectedDate, setSelectedDate,
    dateEvents, setDateEvents, dateEventsLoading, setDateEventsLoading,
    myDayEvents, addToMyDay, removeFromMyDay, clearMyDay,
    itinerary, setItinerary, planStep, startOver,
  } = usePlanStore();

  const [weatherMap, setWeatherMap] = useState({});
  const [building, setBuilding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [buildError, setBuildError] = useState(null);
  const scrollContainerRef = useRef(null);

  // Scroll selected event card into view when map marker is clicked
  useEffect(() => {
    if (!selectedEventId || !scrollContainerRef.current) return;
    const el = scrollContainerRef.current.querySelector(`[data-event-id="${selectedEventId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedEventId]);

  // Load weather for next 14 days (once)
  useEffect(() => {
    async function loadWeather() {
      const map = {};
      const promises = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const ds = d.toISOString().split('T')[0];
        promises.push(
          fetch(`${BASE}/weather?date=${ds}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => { if (data) map[ds] = data; })
            .catch(() => null)
        );
      }
      await Promise.all(promises);
      setWeatherMap(map);
    }
    loadWeather();
  }, []);

  // Fetch events when date or filters change
  const loadDateEvents = useCallback(async () => {
    setDateEventsLoading(true);
    try {
      const params = { date: selectedDate, limit: 50 };
      if (categories.length) params.category = categories;
      if (searchQuery) params.q = searchQuery;
      const events = await api.getEvents(params);
      setDateEvents(events);
    } catch (err) {
      console.error('Failed to load events for date:', err);
      setDateEvents([]);
    }
  }, [selectedDate, categories, searchQuery, setDateEvents, setDateEventsLoading]);

  // Fetch nearby places (top 5 by rating)
  const loadNearbyPlaces = useCallback(async () => {
    try {
      const places = await api.getPlaces({ limit: 5 });
      setNearbyPlaces(places);
    } catch {
      setNearbyPlaces([]);
    }
  }, []);

  useEffect(() => {
    loadDateEvents();
    loadNearbyPlaces();
  }, [loadDateEvents, loadNearbyPlaces]);

  // Build itinerary — sort chronologically before sending
  const handleBuildItinerary = useCallback(async () => {
    if (myDayEvents.length < 2) return;
    setBuildError(null);
    setBuilding(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setBuildError('Please sign in to build an itinerary.');
        setBuilding(false);
        return;
      }
      // Filter out place items — only send real event IDs
      const eventsOnly = myDayEvents.filter((e) => !e.is_place);
      if (eventsOnly.length < 2) {
        setBuildError('Add at least 2 events (not just places) to build an itinerary.');
        setBuilding(false);
        return;
      }
      const sorted = [...eventsOnly].sort((a, b) =>
        new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      );
      const data = await api.buildItinerary(
        { event_ids: sorted.map((e) => e.id), date: selectedDate },
        session.access_token
      );
      setItinerary(data);
    } catch (err) {
      console.error('Failed to build itinerary:', err);
      setBuildError('Failed to build itinerary. Please try again.');
    } finally {
      setBuilding(false);
    }
  }, [myDayEvents, selectedDate, setItinerary]);

  // Save plan
  const handleSave = useCallback(async () => {
    if (!itinerary) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const dayName = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      await api.saveItinerary(
        {
          date: selectedDate,
          title: `My ${dayName} Plan`,
          itinerary_data: itinerary.itinerary || itinerary,
          event_ids: myDayEvents.map((e) => e.id),
          is_public: false,
        },
        session?.access_token
      );
      alert('Plan saved!');
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }, [itinerary, selectedDate, myDayEvents]);

  const myDayIds = new Set(myDayEvents.map((e) => e.id));
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col h-full theme-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b theme-border-s shrink-0">
        <div>
          <h2 className="text-sm font-bold theme-text">Plan a Day</h2>
          <p className="text-[10px] theme-faint">Pick a date · browse events · build your plan</p>
        </div>
        <button onClick={onClose} className="theme-faint hover:theme-text text-lg leading-none px-1">✕</button>
      </div>

      {/* Scrollable content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-4">

        {/* Date picker */}
        <section>
          <DateScrollPicker
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            weatherMap={weatherMap}
          />
        </section>

        {/* Show itinerary view OR browse view */}
        {planStep === 'itinerary' ? (
          <ItineraryView
            itinerary={itinerary}
            weather={weatherMap[selectedDate]}
            dateLabel={dateLabel}
            onSave={handleSave}
            onStartOver={() => { startOver(); }}
            saving={saving}
          />
        ) : (
          <>
            {/* My Day — pinned above events so Build button is always visible */}
            {myDayEvents.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold theme-muted uppercase tracking-widest">My Day</h3>
                  <button onClick={clearMyDay} className="text-[10px] theme-faint hover:text-red-500 transition-colors">Clear all</button>
                </div>
                <MyDayList
                  events={myDayEvents}
                  onRemove={removeFromMyDay}
                  onBuildItinerary={handleBuildItinerary}
                  building={building}
                />
              </section>
            )}

            {building && <LoadingState />}
            {buildError && (
              <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                {buildError}
              </div>
            )}

            {/* Events for this date */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold theme-muted uppercase tracking-widest">
                  Events — {dateLabel}
                </h3>
                <span className="text-[10px] theme-faint">{dateEvents.length} found</span>
              </div>

              {dateEventsLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-xl border border-[var(--border-subtle)] animate-pulse space-y-2">
                      <div className="h-3.5 rounded-full theme-surface2 w-3/4" />
                      <div className="h-2.5 rounded-full theme-surface2 w-1/2" />
                      <div className="h-2.5 rounded-full theme-surface2 w-1/3" />
                    </div>
                  ))}
                </div>
              )}

              {!dateEventsLoading && dateEvents.length === 0 && (
                <div className="p-4 rounded-xl theme-surface2 border border-[var(--border-subtle)] text-center">
                  <p className="text-xs theme-muted">No events found for {dateLabel}.</p>
                  <p className="text-[10px] theme-faint mt-1">Try another date — weekends tend to have more.</p>
                </div>
              )}

              {!dateEventsLoading && dateEvents.length > 0 && (
                <div className="space-y-1.5">
                  {dateEvents.map((event) => (
                    <div key={event.id} data-event-id={event.id}>
                      <PlanEventCard
                        event={event}
                        isAdded={myDayIds.has(event.id)}
                        isSelected={selectedEventId === event.id}
                        onAdd={addToMyDay}
                        onRemove={removeFromMyDay}
                        onSelect={onSelectEvent}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Nearby Places */}
            {nearbyPlaces.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold theme-muted uppercase tracking-widest">
                    Nearby Places
                  </h3>
                  <span className="text-[10px] theme-faint">{nearbyPlaces.length} top rated</span>
                </div>
                <div className="space-y-1.5">
                  {nearbyPlaces.map((place) => (
                    <PlanPlaceCard
                      key={place.id}
                      place={place}
                      isAdded={myDayIds.has(`place-${place.id}`)}
                      onAdd={(p) => addToMyDay({
                        id: `place-${p.id}`,
                        title: p.name,
                        venue_name: p.address,
                        start_datetime: null,
                        is_place: true,
                        place_id: p.id,
                      })}
                      onRemove={() => removeFromMyDay(`place-${place.id}`)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
