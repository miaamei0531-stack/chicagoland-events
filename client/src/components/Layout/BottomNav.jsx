import { NavLink, useNavigate } from 'react-router-dom';
import { useTripStore } from '../../store/trip.js';

export default function BottomNav() {
  const { tripMode, setTripMode, reset: resetTrip } = useTripStore();
  const navigate = useNavigate();

  const base = 'flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] font-medium transition-colors';
  const active = 'text-[var(--accent)]';
  const inactive = 'theme-faint';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 theme-surface border-t theme-border-s flex items-center justify-around pb-safe">
      <NavLink to="/" end className={({ isActive }) => `${base} ${isActive && !tripMode ? active : inactive}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        Map
      </NavLink>

      <button
        onClick={() => { if (tripMode) { resetTrip(); navigate('/'); } else { setTripMode(true); navigate('/'); } }}
        className={`${base} ${tripMode ? active : inactive}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
        </svg>
        Trip
      </button>

      <NavLink to="/collections" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        Saved
      </NavLink>

      <NavLink to="/messages" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Messages
      </NavLink>

      <NavLink to="/profile/me" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Profile
      </NavLink>
    </nav>
  );
}
