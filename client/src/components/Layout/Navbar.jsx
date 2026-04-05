import { Link } from 'react-router-dom';
import LoginButton from '../Auth/LoginButton.jsx';
import UserAvatar from '../Auth/UserAvatar.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useThemeStore } from '../../store/theme.js';
import { useTripStore } from '../../store/trip.js';

export default function Navbar({ onFiltersToggle, onListToggle }) {
  const { user, profile } = useAuth();
  const { dark, toggle } = useThemeStore();
  const { tripMode, setTripMode, reset: resetTrip } = useTripStore();

  return (
    <header className="theme-surface border-b theme-border-s px-3 md:px-5 py-3 flex items-center gap-3 theme-shadow z-30 shrink-0">
      {/* Logo */}
      <Link to="/" className="font-semibold text-sm md:text-base theme-text whitespace-nowrap shrink-0 tracking-tight">
        🗺️ <span className="hidden sm:inline">Chicagoland Events</span>
        <span className="sm:hidden">Chi Events</span>
      </Link>

      <div className="flex-1" />

      {/* Desktop nav links */}
      {user && (
        <>
          <Link
            to="/messages"
            className="hidden sm:block text-xs theme-muted hover:theme-text px-2.5 py-1.5 rounded-lg hover:theme-surface2 transition-colors whitespace-nowrap"
          >
            Messages
          </Link>
          <Link
            to="/collections"
            className="hidden sm:block text-xs theme-muted hover:theme-text px-2.5 py-1.5 rounded-lg hover:theme-surface2 transition-colors whitespace-nowrap"
          >
            Collections
          </Link>
          <Link
            to="/my-submissions"
            className="hidden sm:block text-xs theme-muted hover:theme-text px-2.5 py-1.5 rounded-lg hover:theme-surface2 transition-colors whitespace-nowrap"
          >
            My Submissions
          </Link>
          <Link
            to="/my-trips"
            className="hidden sm:block text-xs theme-muted hover:theme-text px-2.5 py-1.5 rounded-lg hover:theme-surface2 transition-colors whitespace-nowrap"
          >
            My Trips
          </Link>
        </>
      )}
      {profile?.is_admin && (
        <Link
          to="/admin"
          className="hidden sm:block text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          style={{ color: 'var(--accent)' }}
        >
          Admin
        </Link>
      )}

      {/* Mobile toggles */}
      <div className="flex items-center gap-1.5 md:hidden">
        <button
          onClick={onFiltersToggle}
          className="theme-surface2 theme-text text-xs px-2.5 py-1.5 rounded-full border theme-border-s"
        >
          Filters
        </button>
        <button
          onClick={onListToggle}
          className="theme-surface2 theme-text text-xs px-2.5 py-1.5 rounded-full border theme-border-s"
        >
          List
        </button>
      </div>

      {/* Trip mode toggle */}
      {user && (
        <button
          onClick={() => { if (tripMode) resetTrip(); else setTripMode(true); }}
          title={tripMode ? 'Exit trip planner' : 'Plan a Day Trip'}
          className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
            tripMode
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
              : 'theme-surface2 theme-muted border-[var(--border-subtle)] hover:border-[var(--accent)]'
          }`}
        >
          🗺️ {tripMode ? 'Exit Trip' : 'Plan Trip'}
        </button>
      )}

      {/* Dark mode toggle */}
      <button
        onClick={toggle}
        title={dark ? 'Switch to day mode' : 'Switch to dark mode'}
        className="w-8 h-8 flex items-center justify-center rounded-full theme-surface2 border theme-border-s theme-muted hover:theme-text transition-colors text-base shrink-0"
      >
        {dark ? '☀️' : '🌙'}
      </button>

      <LoginButton />
      <UserAvatar />
    </header>
  );
}
