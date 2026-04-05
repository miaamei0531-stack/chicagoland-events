import { useState } from 'react';
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

  return (
    <div className="flex flex-col h-screen theme-bg pb-14 md:pb-0">
      <Navbar
        onFiltersToggle={() => setFiltersOpen((v) => !v)}
        onListToggle={() => setListOpen((v) => !v)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Map */}
        <div className="flex-1 relative">
          <MapView
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
          />
          {!tripMode && <SubmitEventButton />}
        </div>

        {/* Right panel */}
        <div className={`
          fixed md:static inset-y-0 right-0 z-30 md:z-auto
          flex flex-col w-80
          transform transition-transform duration-200 ease-in-out
          ${listOpen || filtersOpen || tripMode ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        `}>
          {tripMode ? (
            <>
              <FiltersPanel open={true} onClose={() => {}} />
              <TripPanel onSelectEvent={setSelectedEventId} />
            </>
          ) : (
            <>
              <FiltersPanel open={filtersOpen} onClose={() => setFiltersOpen(false)} />
              <EventList
                onSelectEvent={(id) => { setSelectedEventId(id); setListOpen(false); }}
                onClose={() => setListOpen(false)}
              />
            </>
          )}
        </div>

        {/* Mobile backdrop */}
        {(filtersOpen || listOpen) && !tripMode && (
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => { setFiltersOpen(false); setListOpen(false); }}
          />
        )}
      </div>
    </div>
  );
}
