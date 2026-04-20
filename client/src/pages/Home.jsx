import { useState, useEffect } from 'react';
import Navbar from '../components/Layout/Navbar.jsx';
import MapView from '../components/Map/MapView.jsx';
import FiltersPanel from '../components/Layout/FiltersPanel.jsx';
import EventList from '../components/Events/EventList.jsx';
import SubmitEventButton from '../components/Submissions/SubmitEventButton.jsx';
import TripPanel from '../components/Trip/TripPanel.jsx';
import PlanDaySidebar from '../components/PlanDay/PlanDaySidebar.jsx';
import { useTripStore } from '../store/trip.js';
import { usePlanStore } from '../store/plan.js';

export default function Home() {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const tripMode = useTripStore((s) => s.tripMode);
  const isPlanOpen = usePlanStore((s) => s.isPlanOpen);
  const closePlan = usePlanStore((s) => s.closePlan);

  useEffect(() => {
    if (tripMode) setListOpen(true);
  }, [tripMode]);

  // When plan sidebar opens, close events list to avoid double sidebar
  useEffect(() => {
    if (isPlanOpen) setListOpen(false);
  }, [isPlanOpen]);

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

        {/* RIGHT — Plan sidebar OR Events list OR Trip panel */}
        {isPlanOpen ? (
          <div className="hidden md:flex flex-col w-[380px] shrink-0 border-l theme-border-s overflow-hidden">
            <PlanDaySidebar
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              onClose={closePlan}
            />
          </div>
        ) : tripMode ? (
          <div className="hidden md:flex flex-col w-80 shrink-0">
            <TripPanel onSelectEvent={setSelectedEventId} />
          </div>
        ) : (
          <div className="hidden md:flex flex-col w-72 shrink-0 theme-surface border-l theme-border-s overflow-hidden">
            <div className="px-3 pt-3 shrink-0">
              <SubmitEventButton inline />
            </div>
            <EventList
              onSelectEvent={setSelectedEventId}
              selectedEventId={selectedEventId}
            />
          </div>
        )}

        {/* Mobile overlays */}
        {(filtersOpen || listOpen || isPlanOpen) && (
          <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => { setFiltersOpen(false); setListOpen(false); if (isPlanOpen) closePlan(); }}
          />
        )}

        {/* Mobile filters drawer */}
        <div className={`md:hidden fixed inset-y-0 left-0 z-30 w-72 theme-surface flex flex-col overflow-hidden transform transition-transform duration-200 ${filtersOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <FiltersPanel open={true} onClose={() => setFiltersOpen(false)} />
        </div>

        {/* Mobile plan / events / trip drawer — 60% width so map stays visible */}
        <div className={`md:hidden fixed inset-y-0 right-0 z-30 w-[60vw] max-w-80 theme-surface flex flex-col overflow-hidden transform transition-transform duration-200 border-l theme-border-s ${
          (listOpen || isPlanOpen) ? 'translate-x-0' : 'translate-x-full'
        }`}>
          {isPlanOpen ? (
            <PlanDaySidebar
              selectedEventId={selectedEventId}
              onSelectEvent={(id) => { setSelectedEventId(id); }}
              onClose={closePlan}
            />
          ) : tripMode ? (
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
