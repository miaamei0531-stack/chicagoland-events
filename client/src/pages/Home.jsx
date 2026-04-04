import { useState } from 'react';
import Navbar from '../components/Layout/Navbar.jsx';
import Sidebar from '../components/Layout/Sidebar.jsx';
import MapView from '../components/Map/MapView.jsx';
import EventList from '../components/Events/EventList.jsx';
import SubmitEventButton from '../components/Submissions/SubmitEventButton.jsx';

export default function Home() {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex flex-1 overflow-hidden relative">
          <MapView
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
          />

          {/* Mobile toggle buttons */}
          <div className="absolute top-3 left-3 z-10 flex gap-2 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center gap-1.5 bg-white text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full shadow border border-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 8h12M3 12h8" />
              </svg>
              Filters
            </button>
            <button
              onClick={() => setListOpen(true)}
              className="flex items-center gap-1.5 bg-white text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full shadow border border-gray-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </button>
          </div>

          <SubmitEventButton />
          <EventList
            onSelectEvent={setSelectedEventId}
            open={listOpen}
            onClose={() => setListOpen(false)}
          />
        </main>
      </div>
    </div>
  );
}
