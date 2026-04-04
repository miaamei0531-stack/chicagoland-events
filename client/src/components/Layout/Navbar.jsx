import { Link } from 'react-router-dom';
import SearchBar from '../Filters/SearchBar.jsx';
import LoginButton from '../Auth/LoginButton.jsx';
import UserAvatar from '../Auth/UserAvatar.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export default function Navbar() {
  const { user, profile } = useAuth();

  return (
    <header className="bg-white border-b px-3 md:px-4 py-2.5 flex items-center gap-2 md:gap-4 shadow-sm z-30">
      <Link to="/" className="font-bold text-sm md:text-base text-gray-800 whitespace-nowrap shrink-0">
        🗺️ <span className="hidden sm:inline">Chicagoland Events</span>
        <span className="sm:hidden">Chi Events</span>
      </Link>

      <div className="flex-1 min-w-0">
        <SearchBar />
      </div>

      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {user && (
          <Link
            to="/my-submissions"
            className="hidden sm:block text-xs md:text-sm text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-50 whitespace-nowrap"
          >
            My Submissions
          </Link>
        )}
        {profile?.is_admin && (
          <Link
            to="/admin"
            className="hidden sm:block text-xs md:text-sm text-orange-600 hover:text-orange-800 px-2 py-1.5 rounded-lg hover:bg-orange-50 whitespace-nowrap font-medium"
          >
            Admin
          </Link>
        )}
        <LoginButton />
        <UserAvatar />
      </div>
    </header>
  );
}
