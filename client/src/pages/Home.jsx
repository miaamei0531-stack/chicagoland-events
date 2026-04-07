import { useState, useEffect } from 'react';
import Navbar from '../components/Layout/Navbar.jsx';
import MapView from '../components/Map/MapView.jsx';
import FiltersPanel from '../components/Layout/FiltersPanel.jsx';
import EventList from '../components/Events/EventList.jsx';
import SubmitEventButton from '../components/Submissions/SubmitEventButton.jsx';
import TripPanel from '../components/Trip/TripPanel.jsx';
import { useTripStore } from '../store/trip.js';

export default function Home() {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const tripMode = useTripStore((s) => s.tripMode);

  // Auto-open the right drawer when trip mode is activated on mobile
  useEffect(() => {
    if (tripMode) setListOpen(true);
  }, [tripMode]);

  return (
    <div className="flex flex-col h-screen theme-bg pb-14 md:pb-0">
      <Navbar
        onFiltersToggle={() => setFiltersOpen((v) => !v)}
        onListToggle={() => setListOpen((v) => !v)}
      />

      <div className="flex flex-1 overflow-hidden relative">

        {/* LEFT — Filters sidebar (desktop only) */}
        <div className="hidden md:flex flex-col w-64 shrink-0 theme-surface border-r theme-border-s overflow-y-auto">
          <FiltersPanel open={true} onClose={() => {}} />
        </div>

        {/* CENTER — Map */}
        <div className="flex-1 relative">
          <MapView
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
          />
        </div>

        {/* RIGHT — Events list (desktop) or Trip panel */}
        {tripMode ? (
          <div className="hidden md:flex flex-col w-80 shrink-0">
            <TripPanel onSelectEvent={setSelectedEventId} />
          </div>
        ) : (
          <div className="hidden md:flex flex-col w-72 shrink-0 theme-surface border-l theme-border-s overflow-hidden">
            {!tripMode && (
              <div className="px-3 pt-3 shrink-0">
                <SubmitEventButton inline />
              </div>
            )}
            <EventList
              onSelectEvent={setSelectedEventId}
              selectedEventId={selectedEventId}
            />
          </div>
        )}

        {/* Mobile slide-in panels */}
        {(filtersOpen || listOpen || (tripMode && (filtersOpen || listOpen))) && (
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => { setFiltersOpen(false); setListOpen(false); }}
          />
        )}

        {/* Mobile filters drawer */}
        <div className={`md:hidden fixed inset-y-0 left-0 z-30 w-72 theme-surface flex flex-col overflow-hidden transform transition-transform duration-200 ${filtersOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <FiltersPanel open={true} onClose={() => setFiltersOpen(false)} />
        </div>

        {/* Mobile events / trip drawer */}
        <div className={`md:hidden fixed inset-y-0 right-0 z-30 w-80 theme-surface flex flex-col overflow-hidden transform transition-transform duration-200 ${listOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {tripMode ? (
            <TripPanel onSelectEvent={(id) => { setSelectedEventId(id); setListOpen(false); }} />
          ) : (
            <>
              <div className="px-3 pt-3 shrink-0">
                <SubmitEventButton inline />
              </div>
              <EventList
                onSelectEvent={(id) => { setSelectedEventId(id); setListOpen(false); }}
                selectedEventId={selectedEventId}
                onClose={() => setListOpen(false)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
